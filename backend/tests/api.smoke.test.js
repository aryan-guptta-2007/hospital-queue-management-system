const request = require('supertest');
const { app, seedDepartments, seedUsers, issueToken, auth } = require('./helpers/factories');

/**
 * The ground this covered as integration-test.js: the endpoints are reachable,
 * auth works end to end, and the dashboard summary adds up.
 */
describe('API smoke', () => {
  let opd;
  let adminJwt;

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
    ({ adminJwt } = await seedUsers(opd._id));
  });

  it('answers the health check', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('lists departments publicly, because the patient form needs them', async () => {
    const res = await request(app).get('/api/departments');

    expect(res.status).toBe(200);
    expect(res.body.data.map((d) => d.code).sort()).toEqual(['CARD', 'OPD']);
  });

  it('signs an admin in and reports who they are', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hospital.test', password: 'secret123' });

    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('admin');
    expect(login.body.user.mustChangePassword).toBe(false);

    const me = await request(app).get('/api/auth/me').set(auth(login.body.token));
    expect(me.body.user.email).toBe('admin@hospital.test');
    expect(me.body.user.password).toBeUndefined();
  });

  it('rejects bad credentials without saying which half was wrong', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hospital.test', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('summarises every department for the dashboard', async () => {
    await issueToken(opd, { name: 'Arun Sharma', age: 30 });
    await issueToken(opd, { name: 'Kamla Devi', age: 72 });

    const res = await request(app).get('/api/queue/all').set(auth(adminJwt));

    const summary = res.body.data.find((d) => d.department.code === 'OPD');
    expect(summary.waitingCount).toBe(2);
    expect(summary.currentToken).toBeNull();

    await request(app)
      .post(`/api/queue/${opd._id}/next`)
      .set(auth(adminJwt))
      .send({ currentServingId: null });

    const after = await request(app).get('/api/queue/all').set(auth(adminJwt));
    const updated = after.body.data.find((d) => d.department.code === 'OPD');

    expect(updated.waitingCount).toBe(1);
    expect(updated.currentToken).toBe('OPD-002'); // the senior went first
  });

  it('rejects a malformed id with 400, not 500', async () => {
    const res = await request(app).get('/api/queue/not-an-id').set(auth(adminJwt));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid id/i);
  });
});
