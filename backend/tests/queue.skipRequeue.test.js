const request = require('supertest');
const Token = require('../src/models/Token');
const { app, seedDepartments, seedUsers, issueToken, auth } = require('./helpers/factories');

describe('skip and requeue', () => {
  let opd;
  let adminJwt;
  let first;

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
    ({ adminJwt } = await seedUsers(opd._id));

    first = await issueToken(opd, { name: 'Arun Sharma', age: 30 });
    await issueToken(opd, { name: 'Bimal Roy', age: 30 });
    await issueToken(opd, { name: 'Chetan Patil', age: 30 });
  });

  const act = (tokenId, action) =>
    request(app).post(`/api/queue/token/${tokenId}/${action}`).set(auth(adminJwt));

  const waitingOrder = async () => {
    const res = await request(app).get(`/api/queue/${opd._id}`).set(auth(adminJwt));
    return res.body.data.waiting.map((t) => t.tokenNumber);
  };

  it('moves a skipped patient to the end of their priority group when requeued', async () => {
    expect(await waitingOrder()).toEqual(['OPD-001', 'OPD-002', 'OPD-003']);

    expect((await act(first._id, 'skip')).status).toBe(200);
    expect(await waitingOrder()).toEqual(['OPD-002', 'OPD-003']);

    const listed = await request(app).get(`/api/queue/${opd._id}`).set(auth(adminJwt));
    expect(listed.body.data.skipped.map((t) => t.tokenNumber)).toEqual(['OPD-001']);

    const requeued = await act(first._id, 'requeue');
    expect(requeued.status).toBe(200);

    // Back in the queue, but behind everyone who was already waiting
    expect(await waitingOrder()).toEqual(['OPD-002', 'OPD-003', 'OPD-001']);

    const reloaded = await Token.findById(first._id);
    expect(reloaded.status).toBe('waiting');
    expect(reloaded.requeuedAt).toBeInstanceOf(Date);
    expect(reloaded.queuedAt.getTime()).toBeGreaterThan(reloaded.createdAt.getTime());
  });

  it('still puts priority ahead of a requeued patient', async () => {
    await act(first._id, 'skip');
    await act(first._id, 'requeue');

    const senior = await issueToken(opd, { name: 'Kamla Devi', age: 72 });

    const order = await waitingOrder();
    expect(order[0]).toBe(senior.tokenNumber);
    expect(order[order.length - 1]).toBe(first.tokenNumber);
  });

  it('refuses transitions that make no sense', async () => {
    // Requeueing something that was never skipped
    const tooEarly = await act(first._id, 'requeue');
    expect(tooEarly.status).toBe(409);
    expect(tooEarly.body.message).toMatch(/already "waiting"/);

    await act(first._id, 'skip');

    // Skipping it twice
    expect((await act(first._id, 'skip')).status).toBe(409);

    // Completing something that is not being served
    expect((await act(first._id, 'complete')).status).toBe(409);

    await act(first._id, 'requeue');

    // And requeueing it twice
    expect((await act(first._id, 'requeue')).status).toBe(409);
  });

  it('can skip the patient currently being served', async () => {
    const serving = await request(app)
      .post(`/api/queue/${opd._id}/next`)
      .set(auth(adminJwt))
      .send({ currentServingId: null });

    expect((await act(serving.body.data._id, 'skip')).status).toBe(200);
    expect(await Token.countDocuments({ department: opd._id, status: 'serving' })).toBe(0);
  });
});
