const request = require('supertest');
const AuditLog = require('../src/models/AuditLog');
const Token = require('../src/models/Token');
const { app, seedDepartments, seedUsers, issueToken, auth } = require('./helpers/factories');

/** Entries are written in the background, so give them a moment to land */
const waitForEntries = async (expected, timeout = 2000) => {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const count = await AuditLog.countDocuments();
    if (count >= expected) break;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return AuditLog.find().sort({ createdAt: 1 });
};

describe('audit log', () => {
  let opd;
  let card;
  let adminJwt;
  let opdStaffJwt;

  beforeEach(async () => {
    ({ opd, card } = await seedDepartments());
    ({ adminJwt, opdStaffJwt } = await seedUsers(opd._id));
  });

  describe('recording staff actions', () => {
    it('records who called the next patient, and for which token', async () => {
      const waiting = await issueToken(opd, { name: 'Arun Sharma' });

      await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(opdStaffJwt))
        .send({ currentServingId: null });

      const [entry] = await waitForEntries(1);

      expect(entry.action).toBe('call_next');
      expect(String(entry.token)).toBe(String(waiting._id));
      expect(String(entry.department)).toBe(String(opd._id));
      expect(entry.user).toBeTruthy();
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.details).toContain(waiting.tokenNumber);
    });

    it('names the staff member who acted', async () => {
      await issueToken(opd, { name: 'Arun Sharma' });

      await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(opdStaffJwt))
        .send({ currentServingId: null });

      await waitForEntries(1);

      const res = await request(app).get('/api/audit').set(auth(adminJwt));

      expect(res.body.data.entries[0].user).toMatchObject({
        name: 'OPD Staff',
        email: 'opd@hospital.test',
        role: 'staff',
      });
    });

    it('records skip, complete and requeue', async () => {
      const first = await issueToken(opd, { name: 'Arun Sharma' });
      const second = await issueToken(opd, { name: 'Bimal Roy' });

      await request(app).post(`/api/queue/token/${first._id}/skip`).set(auth(opdStaffJwt));
      await request(app).post(`/api/queue/token/${first._id}/requeue`).set(auth(opdStaffJwt));

      await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(opdStaffJwt))
        .send({ currentServingId: null });

      const serving = await Token.findOne({ department: opd._id, status: 'serving' });
      await request(app).post(`/api/queue/token/${serving._id}/complete`).set(auth(opdStaffJwt));

      const entries = await waitForEntries(4);
      const actions = entries.map((e) => e.action);

      expect(actions).toEqual(expect.arrayContaining(['skip', 'requeue', 'call_next', 'complete']));
      expect(String(entries.find((e) => e.action === 'skip').token)).toBe(String(first._id));
      expect(second).toBeTruthy();
    });

    it('records an emergency insert and a recall', async () => {
      await request(app)
        .post(`/api/queue/${opd._id}/emergency`)
        .set(auth(opdStaffJwt))
        .send({ name: 'Critical Patient', note: 'Chest pain' });

      await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(opdStaffJwt))
        .send({ currentServingId: null });

      await request(app).post(`/api/queue/${opd._id}/recall`).set(auth(opdStaffJwt));

      const entries = await waitForEntries(3);
      const emergency = entries.find((e) => e.action === 'emergency_insert');

      expect(emergency.details).toContain('Critical Patient');
      expect(entries.some((e) => e.action === 'recall')).toBe(true);
    });

    it('records department changes, which have no token', async () => {
      await request(app)
        .post('/api/departments')
        .set(auth(adminJwt))
        .send({ name: 'Dermatology', code: 'DERM' });

      await request(app)
        .patch(`/api/departments/${opd._id}`)
        .set(auth(adminJwt))
        .send({ avgConsultationTime: 25 });

      const entries = await waitForEntries(2);
      const created = entries.find((e) => e.action === 'department_create');
      const updated = entries.find((e) => e.action === 'department_update');

      expect(created.token).toBeNull();
      expect(created.details).toContain('DERM');
      expect(updated.details).toContain('avgConsultationTime');
    });

    it('does not record an action that was refused', async () => {
      const cardToken = await issueToken(card, { name: 'Card Patient' });

      // OPD staff may not touch Cardiology
      const blocked = await request(app)
        .post(`/api/queue/token/${cardToken._id}/skip`)
        .set(auth(opdStaffJwt));

      expect(blocked.status).toBe(403);

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(await AuditLog.countDocuments()).toBe(0);
    });
  });

  describe('reading the log', () => {
    beforeEach(async () => {
      const opdToken = await issueToken(opd, { name: 'Arun Sharma' });
      const cardToken = await issueToken(card, { name: 'Card Patient' });

      await request(app).post(`/api/queue/token/${opdToken._id}/skip`).set(auth(opdStaffJwt));
      await request(app).post(`/api/queue/token/${cardToken._id}/skip`).set(auth(adminJwt));
      await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(adminJwt))
        .send({ currentServingId: null });

      await waitForEntries(3);
    });

    it('is closed to anyone but an admin', async () => {
      expect((await request(app).get('/api/audit')).status).toBe(401);
      expect((await request(app).get('/api/audit').set(auth(opdStaffJwt))).status).toBe(403);
      expect((await request(app).get('/api/audit').set(auth(adminJwt))).status).toBe(200);
    });

    it('returns the newest entry first', async () => {
      const res = await request(app).get('/api/audit').set(auth(adminJwt));

      const times = res.body.data.entries.map((e) => new Date(e.createdAt).getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));
      expect(res.body.data.total).toBe(3);
    });

    it('filters by action', async () => {
      const res = await request(app).get('/api/audit?action=skip').set(auth(adminJwt));

      expect(res.body.data.total).toBe(2);
      expect(res.body.data.entries.every((e) => e.action === 'skip')).toBe(true);
    });

    it('filters by department', async () => {
      const res = await request(app).get(`/api/audit?departmentId=${card._id}`).set(auth(adminJwt));

      expect(res.body.data.total).toBe(1);
      expect(res.body.data.entries[0].department.code).toBe('CARD');
    });

    it('filters by the staff member', async () => {
      const everything = await request(app).get('/api/audit').set(auth(adminJwt));
      const staffEntry = everything.body.data.entries.find((e) => e.user.role === 'staff');

      const res = await request(app)
        .get(`/api/audit?userId=${staffEntry.user._id}`)
        .set(auth(adminJwt));

      expect(res.body.data.total).toBe(1);
      expect(res.body.data.entries[0].user.email).toBe('opd@hospital.test');
    });

    it('filters by date, ignoring entries outside the day', async () => {
      const today = await request(app)
        .get('/api/audit?from=2020-01-01&to=2020-01-01')
        .set(auth(adminJwt));

      expect(today.body.data.total).toBe(0);
    });

    it('paginates', async () => {
      const page = await request(app).get('/api/audit?limit=2&page=1').set(auth(adminJwt));

      expect(page.body.data.entries).toHaveLength(2);
      expect(page.body.data).toMatchObject({ total: 3, pages: 2, page: 1, limit: 2 });

      const second = await request(app).get('/api/audit?limit=2&page=2').set(auth(adminJwt));
      expect(second.body.data.entries).toHaveLength(1);
    });

    it('rejects a filter it does not recognise', async () => {
      const res = await request(app).get('/api/audit?action=sell-the-hospital').set(auth(adminJwt));

      expect(res.status).toBe(400);
    });

    it('lists the available actions for the filter', async () => {
      const res = await request(app).get('/api/audit/actions').set(auth(adminJwt));

      expect(res.body.data).toEqual(
        expect.arrayContaining(['call_next', 'skip', 'complete', 'requeue', 'emergency_insert'])
      );
    });
  });
});
