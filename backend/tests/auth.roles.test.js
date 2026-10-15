const request = require('supertest');
const User = require('../src/models/User');
const { app, seedDepartments, seedUsers, login, auth } = require('./helpers/factories');

describe('role enforcement', () => {
  let opd;
  let adminJwt;
  let opdStaffJwt;

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
    ({ adminJwt, opdStaffJwt } = await seedUsers(opd._id));
  });

  const register = (jwt, body) => {
    const req = request(app).post('/api/auth/register');
    return (jwt ? req.set(auth(jwt)) : req).send(body);
  };

  const newStaff = { name: 'New Staff', email: 'new@hospital.test', password: 'secret123' };

  it('refuses registration without a token', async () => {
    const res = await register(null, newStaff);

    expect(res.status).toBe(401);
    expect(await User.countDocuments({ email: newStaff.email })).toBe(0);
  });

  it('refuses registration by a staff member', async () => {
    const res = await register(opdStaffJwt, newStaff);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permission/i);
    expect(await User.countDocuments({ email: newStaff.email })).toBe(0);
  });

  it('lets an admin register someone, defaulting them to staff', async () => {
    const res = await register(adminJwt, newStaff);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('staff');
  });

  it('never takes a role from the body unless the caller is an admin', async () => {
    // Staff cannot register at all, so the only way in is as an admin
    const asAdmin = await register(adminJwt, { ...newStaff, role: 'admin' });
    expect(asAdmin.body.user.role).toBe('admin');

    const nonsense = await register(adminJwt, {
      ...newStaff,
      email: 'nonsense@hospital.test',
      role: 'superuser',
    });
    expect(nonsense.status).toBe(400);
  });

  it('keeps department writes for admins only', async () => {
    const body = { name: 'Dermatology', code: 'DERM' };

    expect(
      (await request(app).post('/api/departments').set(auth(opdStaffJwt)).send(body)).status
    ).toBe(403);
    expect(
      (await request(app).post('/api/departments').set(auth(adminJwt)).send(body)).status
    ).toBe(201);

    const patch = { avgConsultationTime: 25 };
    expect(
      (await request(app).patch(`/api/departments/${opd._id}`).set(auth(opdStaffJwt)).send(patch))
        .status
    ).toBe(403);
    expect(
      (await request(app).patch(`/api/departments/${opd._id}`).set(auth(adminJwt)).send(patch))
        .status
    ).toBe(200);
  });

  it('cuts off a token the moment its account is disabled or deleted', async () => {
    const jwt = await login('float@hospital.test');
    expect((await request(app).get('/api/auth/me').set(auth(jwt))).status).toBe(200);

    await User.updateOne({ email: 'float@hospital.test' }, { isActive: false });
    const disabled = await request(app).get('/api/auth/me').set(auth(jwt));
    expect(disabled.status).toBe(403);
    expect(disabled.body.message).toMatch(/disabled/i);

    await User.deleteOne({ email: 'float@hospital.test' });
    const deleted = await request(app).get('/api/auth/me').set(auth(jwt));
    expect(deleted.status).toBe(401);
  });
});
