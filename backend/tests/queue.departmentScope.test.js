const request = require('supertest');
const { app, seedDepartments, seedUsers, issueToken, auth } = require('./helpers/factories');

describe('department scoping for staff', () => {
  let opd;
  let card;
  let adminJwt;
  let opdStaffJwt;
  let floatStaffJwt;
  let cardToken;

  beforeEach(async () => {
    ({ opd, card } = await seedDepartments());
    ({ adminJwt, opdStaffJwt, floatStaffJwt } = await seedUsers(opd._id));

    await issueToken(opd, { name: 'Opd Patient', age: 30 });
    cardToken = await issueToken(card, { name: 'Card Patient', age: 30 });
  });

  it('lets OPD staff read their own queue only', async () => {
    expect((await request(app).get(`/api/queue/${opd._id}`).set(auth(opdStaffJwt))).status).toBe(
      200
    );

    const blocked = await request(app).get(`/api/queue/${card._id}`).set(auth(opdStaffJwt));
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toMatch(/own department/i);
  });

  it('blocks every write against another department', async () => {
    const next = await request(app)
      .post(`/api/queue/${card._id}/next`)
      .set(auth(opdStaffJwt))
      .send({ currentServingId: null });
    expect(next.status).toBe(403);

    const emergency = await request(app)
      .post(`/api/queue/${card._id}/emergency`)
      .set(auth(opdStaffJwt))
      .send({ name: 'Someone Else' });
    expect(emergency.status).toBe(403);

    expect(
      (await request(app).post(`/api/queue/${card._id}/recall`).set(auth(opdStaffJwt))).status
    ).toBe(403);
  });

  it('blocks token actions by the token’s own department, not the URL', async () => {
    // Nothing in the path says "Cardiology" — it is read from the token
    const skip = await request(app)
      .post(`/api/queue/token/${cardToken._id}/skip`)
      .set(auth(opdStaffJwt));

    expect(skip.status).toBe(403);
  });

  it('shows a scoped staff member only their own department in the summary', async () => {
    const scoped = await request(app).get('/api/queue/all').set(auth(opdStaffJwt));
    expect(scoped.body.data.map((d) => d.department.code)).toEqual(['OPD']);

    const admin = await request(app).get('/api/queue/all').set(auth(adminJwt));
    expect(admin.body.data.map((d) => d.department.code).sort()).toEqual(['CARD', 'OPD']);
  });

  it('leaves admins and unscoped staff free to work anywhere', async () => {
    expect((await request(app).get(`/api/queue/${card._id}`).set(auth(adminJwt))).status).toBe(200);
    expect((await request(app).get(`/api/queue/${card._id}`).set(auth(floatStaffJwt))).status).toBe(
      200
    );
    expect((await request(app).get(`/api/queue/${opd._id}`).set(auth(floatStaffJwt))).status).toBe(
      200
    );
  });
});
