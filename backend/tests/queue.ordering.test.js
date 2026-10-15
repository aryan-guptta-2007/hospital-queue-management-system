const request = require('supertest');
const { app, seedDepartments, seedUsers, issueToken, auth } = require('./helpers/factories');

describe('queue ordering', () => {
  let opd;
  let adminJwt;

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
    ({ adminJwt } = await seedUsers(opd._id));
  });

  it('serves emergency first, then seniors, then normal by arrival', async () => {
    // Issued in an order that is deliberately NOT the serving order
    const normalFirst = await issueToken(opd, { name: 'Arun Sharma', age: 34 });
    const senior = await issueToken(opd, { name: 'Kamla Devi', age: 72 });
    const normalSecond = await issueToken(opd, { name: 'Priya Singh', age: 25 });
    const emergency = await issueToken(opd, { name: 'Vikram Rao', age: 47, emergency: true });

    const res = await request(app).get(`/api/queue/${opd._id}`).set(auth(adminJwt));

    expect(res.status).toBe(200);
    expect(res.body.data.waiting.map((t) => t.tokenNumber)).toEqual([
      emergency.tokenNumber,
      senior.tokenNumber,
      normalFirst.tokenNumber,
      normalSecond.tokenNumber,
    ]);
    expect(res.body.data.waiting.map((t) => t.priority)).toEqual([3, 2, 1, 1]);
    expect(res.body.data.waiting.map((t) => t.position)).toEqual([1, 2, 3, 4]);
  });

  it('gives each waiting token an estimate that grows down the queue', async () => {
    for (let i = 0; i < 4; i += 1) {
      await issueToken(opd, { name: `Patient Number ${i}`, age: 30 });
    }

    const res = await request(app).get(`/api/queue/${opd._id}`).set(auth(adminJwt));
    const estimates = res.body.data.waiting.map((t) => t.estimatedWaitTime);

    expect(estimates).toEqual([...estimates].sort((a, b) => a - b));
    expect(estimates[3]).toBeGreaterThan(estimates[0]);

    res.body.data.waiting.forEach((token) => {
      expect(token.estimatedWaitRange.min).toBeLessThanOrEqual(token.estimatedWaitTime);
      expect(token.estimatedWaitRange.max).toBeGreaterThanOrEqual(token.estimatedWaitTime);
    });
  });

  it('agrees with the patient-facing status endpoint', async () => {
    await issueToken(opd, { name: 'Kamla Devi', age: 72 });
    const mine = await issueToken(opd, { name: 'Arun Sharma', age: 34 });

    const queue = await request(app).get(`/api/queue/${opd._id}`).set(auth(adminJwt));
    const row = queue.body.data.waiting.find((t) => t.tokenNumber === mine.tokenNumber);

    const status = await request(app).get(`/api/tokens/status/${mine.publicCode}`);

    expect(status.body.data.position).toBe(row.position);
    expect(status.body.data.estimatedWaitTime).toBe(row.estimatedWaitTime);
    expect(status.body.data.estimatedWaitRange).toEqual(row.estimatedWaitRange);
  });
});
