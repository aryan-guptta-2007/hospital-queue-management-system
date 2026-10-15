const request = require('supertest');
const { app, seedDepartments, seedUsers, generateToken, auth } = require('./helpers/factories');

const OBJECT_ID = /[0-9a-f]{24}/;

describe('public endpoints', () => {
  let opd;
  let adminJwt;
  let token;

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
    ({ adminJwt } = await seedUsers(opd._id));

    const res = await generateToken(opd._id, {
      name: 'Rahul Sharma',
      age: 72,
      phone: '9876543210',
    });
    token = res.body.data;
  });

  const assertNothingSensitive = (payload) => {
    const serialised = JSON.stringify(payload);

    expect(serialised).not.toMatch(/"age"/);
    expect(serialised).not.toMatch(/phone/i);
    expect(serialised).not.toContain('9876543210');
    expect(serialised).not.toContain('Sharma'); // only the initial survives
  };

  it('masks the name and hides age and phone on token status', async () => {
    const res = await request(app).get(`/api/tokens/status/${token.publicCode}`);

    expect(res.status).toBe(200);
    expect(res.body.data.patient).toEqual({ name: 'Rahul S.' });
    expect(res.body.data.patient._id).toBeUndefined();
    assertNothingSensitive(res.body.data);

    // The useful parts are still there
    expect(res.body.data.tokenNumber).toBe(token.tokenNumber);
    expect(res.body.data.position).toBe(1);
    expect(res.body.data.department.name).toBe('Out Patient Department');
  });

  it('masks the display board, and exposes no patient ids', async () => {
    await request(app)
      .post(`/api/queue/${opd._id}/next`)
      .set(auth(adminJwt))
      .send({ currentServingId: null });

    const res = await request(app).get(`/api/queue/public/${opd._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.serving.patient.name).toBe('Rahul S.');
    assertNothingSensitive(res.body.data);

    // The department id is public (GET /api/departments lists it); a patient id is not
    expect(res.body.data.serving.patient).toEqual({ name: 'Rahul S.' });
    expect(OBJECT_ID.test(JSON.stringify(res.body.data.serving.patient))).toBe(false);
  });

  it('masks the current-token endpoint', async () => {
    await request(app)
      .post(`/api/queue/${opd._id}/next`)
      .set(auth(adminJwt))
      .send({ currentServingId: null });

    const res = await request(app).get(`/api/tokens/current/${opd._id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.patient).toEqual({ name: 'Rahul S.' });
    assertNothingSensitive(res.body.data);
  });

  it('retires the guessable lookup by token number', async () => {
    const res = await request(app).get(`/api/tokens/${token.tokenNumber}/status`);

    expect(res.status).toBe(410);
    expect(res.body.message).toMatch(/publicCode/);
  });

  it('still gives staff the full record', async () => {
    const res = await request(app).get(`/api/queue/${opd._id}`).set(auth(adminJwt));

    const waiting = res.body.data.waiting[0];
    expect(waiting.patient.name).toBe('Rahul Sharma');
    expect(waiting.patient.age).toBe(72);
  });
});
