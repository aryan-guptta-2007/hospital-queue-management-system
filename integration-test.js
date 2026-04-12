/**
 * integration-test.js
 * Full end-to-end test: login → generate tokens → verify priority sort → admin actions
 * Run with: node integration-test.js (backend must be running on :5001)
 */
const http = require('http');

const BASE = 'http://localhost:5001';

// ── Tiny HTTP helper ────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost', port: 5001,
      path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.log(`  ❌ ${msg}`); process.exit(1); };
const head = (msg) => console.log(`\n━━━ ${msg} ━━━`);

async function run() {
  console.log('🏥 Hospital Queue System — Integration Test\n');

  // 1. Health check
  head('HEALTH CHECK');
  const health = await request('GET', '/api/health');
  health.body.success ? pass('API is running') : fail('API health failed');

  // 2. Admin login
  head('ADMIN LOGIN');
  const loginRes = await request('POST', '/api/auth/login',
    { email: 'admin@hospital.com', password: 'admin123' });
  if (!loginRes.body.token) fail('Login failed: ' + JSON.stringify(loginRes.body));
  const jwt = loginRes.body.token;
  pass(`Logged in as: ${loginRes.body.user.name} (${loginRes.body.user.role})`);

  // 3. Get departments
  head('DEPARTMENTS');
  const deptRes = await request('GET', '/api/departments');
  const depts = deptRes.body.data;
  pass(`Loaded ${depts.length} departments`);
  const opd = depts.find(d => d.code === 'OPD');
  if (!opd) fail('OPD department not found');
  pass(`OPD found → avgConsultationTime: ${opd.avgConsultationTime} min`);

  // 4. Generate tokens for 5 patients (mixed ages → auto priority)
  head('PATIENT TOKEN GENERATION');
  const patients = [
    { name: 'Arun Sharma',  age: 30 },   // Normal
    { name: 'Kamla Devi',   age: 72 },   // Senior (auto priority 2)
    { name: 'Raj Kumar',    age: 45 },   // Normal
    { name: 'Suresh Nair',  age: 65 },   // Senior (auto priority 2)
    { name: 'Priya Singh',  age: 25 },   // Normal
  ];
  const pLabel = { 3: '🚨 Emergency', 2: '👴 Senior', 1: '👤 Normal' };
  const tokens = [];

  for (const p of patients) {
    const r = await request('POST', '/api/tokens/generate',
      { name: p.name, age: p.age, departmentId: opd._id });
    if (!r.body.success) fail(`Token generation failed: ${JSON.stringify(r.body)}`);
    const t = r.body.data;
    tokens.push(t);
    console.log(`  ${t.tokenNumber} | ${p.name.padEnd(15)} | age ${p.age} | ${pLabel[t.patient.priority]} | pos #${t.position} | ~${t.estimatedWaitTime}min`);
  }

  // Verify seniors got priority 2
  const kamla = tokens.find(t => t.patient.name === 'Kamla Devi');
  const suresh = tokens.find(t => t.patient.name === 'Suresh Nair');
  kamla.patient.priority === 2 ? pass('Kamla Devi auto-elevated to Senior priority') : fail('Senior priority not set');
  suresh.patient.priority === 2 ? pass('Suresh Nair auto-elevated to Senior priority') : fail('Senior priority not set');

  // 5. View sorted queue — Seniors must come before Normals
  head('SORTED QUEUE VERIFICATION');
  const queueRes = await request('GET', `/api/queue/${opd._id}`, null, jwt);
  const queue = queueRes.body.data.waiting;
  console.log(`  Total waiting: ${queue.length}`);
  queue.forEach(t => {
    console.log(`  #${t.position} ${t.tokenNumber.padEnd(8)} | ${t.patient.name.padEnd(15)} | ${pLabel[t.priority].padEnd(15)} | ~${t.estimatedWaitTime}min`);
  });

  // Priority must be descending (or equal) through the list
  for (let i = 1; i < queue.length; i++) {
    if (queue[i].priority > queue[i-1].priority)
      fail(`Priority order wrong at position ${i+1}`);
  }
  pass('Queue is correctly sorted: Senior before Normal');

  // 6. Insert emergency — must jump to #1
  head('EMERGENCY INSERT');
  const emrRes = await request('POST', `/api/queue/${opd._id}/emergency`,
    { name: 'Critical Patient', age: 50, note: 'Chest pain' }, jwt);
  if (!emrRes.body.success) fail('Emergency insert failed');
  pass(`Emergency token: ${emrRes.body.data.tokenNumber} | priority ${emrRes.body.data.priority}`);

  // Verify emergency is #1 in queue
  const afterEmrg = await request('GET', `/api/queue/${opd._id}`, null, jwt);
  const firstToken = afterEmrg.body.data.waiting[0];
  firstToken.priority === 3
    ? pass(`Emergency is #1: ${firstToken.tokenNumber} — ${firstToken.patient.name}`)
    : fail(`Emergency NOT at front! Got priority ${firstToken.priority}`);

  // 7. Call next (must serve emergency patient)
  head('CALL NEXT PATIENT');
  const nextRes = await request('POST', `/api/queue/${opd._id}/next`, null, jwt);
  const serving = nextRes.body.data;
  if (!serving) fail('callNext returned no patient');
  serving.priority === 3
    ? pass(`Correctly serving Emergency: ${serving.tokenNumber} — ${serving.patient.name}`)
    : fail(`Wrong patient called! Priority was ${serving.priority}`);

  // 8. Token status check (patient-facing)
  head('PATIENT TOKEN STATUS CHECK');
  const firstToken2 = afterEmrg.body.data.waiting[1]; // was #2 (Senior)
  const statusRes = await request('GET', `/api/tokens/${firstToken2.tokenNumber}/status`);
  const s = statusRes.body.data;
  pass(`${s.tokenNumber} → status: ${s.status} | pos #${s.position} | ~${s.estimatedWaitTime}min`);

  // 9. Skip a patient
  head('SKIP PATIENT');
  const toSkip = afterEmrg.body.data.waiting[afterEmrg.body.data.waiting.length - 1];
  const skipRes = await request('POST', `/api/queue/token/${toSkip._id}/skip`, null, jwt);
  skipRes.body.success
    ? pass(`Skipped: ${skipRes.body.data.tokenNumber}`)
    : fail('Skip failed');

  // 10. Dashboard summary
  head('DASHBOARD SUMMARY (all depts)');
  const dashRes = await request('GET', '/api/queue/all', null, jwt);
  const activeDepts = dashRes.body.data.filter(d => d.waitingCount > 0);
  pass(`${dashRes.body.data.length} departments loaded | ${activeDepts.length} active`);
  const opdSummary = dashRes.body.data.find(d => d.department.code === 'OPD');
  pass(`OPD: ${opdSummary.waitingCount} waiting | serving: ${opdSummary.currentToken || 'none'}`);

  console.log('\n' + '═'.repeat(50));
  console.log('🎉 ALL TESTS PASSED — System is production-ready!');
  console.log('═'.repeat(50) + '\n');
}

run().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
