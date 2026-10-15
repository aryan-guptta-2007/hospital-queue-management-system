const request = require('supertest');
const Token = require('../src/models/Token');
const { app, seedDepartments, seedUsers, issueToken, auth } = require('./helpers/factories');

describe('calling the next patient', () => {
  let opd;
  let adminJwt;

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
    ({ adminJwt } = await seedUsers(opd._id));

    for (let i = 0; i < 3; i += 1) {
      await issueToken(opd, { name: `Patient Number ${i}`, age: 30 });
    }
  });

  const callNext = (currentServingId) =>
    request(app).post(`/api/queue/${opd._id}/next`).set(auth(adminJwt)).send({ currentServingId });

  it('serves the front of the queue when nothing is in progress', async () => {
    const res = await callNext(null);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('serving');
    expect(await Token.countDocuments({ department: opd._id, status: 'serving' })).toBe(1);
  });

  it('leaves exactly one serving token when two staff call at the same moment', async () => {
    const serving = (await callNext(null)).body.data;

    // Both screens show the same serving token and both press Call next
    const [first, second] = await Promise.all([callNext(serving._id), callNext(serving._id)]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);

    const loser = first.status === 409 ? first : second;
    expect(loser.body.message).toBe('Queue changed, please refresh');

    // The partial unique index is the last line of defence here
    expect(await Token.countDocuments({ department: opd._id, status: 'serving' })).toBe(1);
    expect(await Token.countDocuments({ department: opd._id, status: 'completed' })).toBe(1);
  });

  it('refuses a stale screen', async () => {
    const serving = (await callNext(null)).body.data;

    // Claiming nothing is serving, when something is
    expect((await callNext(null)).status).toBe(409);

    // Claiming the wrong token is serving
    const other = await Token.findOne({ department: opd._id, status: 'waiting' });
    expect((await callNext(other._id)).status).toBe(409);

    // The real one still works
    expect((await callNext(serving._id)).status).toBe(200);
  });

  it('reports an empty queue rather than inventing a patient', async () => {
    await Token.deleteMany({ department: opd._id });

    const res = await callNext(null);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toMatch(/empty/i);
  });
});
