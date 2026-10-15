const request = require('supertest');
const mongoose = require('mongoose');
const Token = require('../src/models/Token');
const { app, seedDepartments, seedUsers, auth } = require('./helpers/factories');

const MINUTE = 60000;

describe('analytics', () => {
  let opd;
  let card;
  let adminJwt;
  let opdStaffJwt;
  let sequence = 0;

  /** Inserts a token with exact timestamps, bypassing the normal flow */
  const insertToken = async ({
    department,
    serviceDate,
    status,
    waitMinutes,
    consultationMinutes,
    createdAt = new Date(`${serviceDate}T05:00:00Z`),
  }) => {
    sequence += 1;

    const queuedAt = createdAt;
    const calledAt =
      waitMinutes == null ? null : new Date(queuedAt.getTime() + waitMinutes * MINUTE);
    const completedAt =
      consultationMinutes == null || !calledAt
        ? null
        : new Date(calledAt.getTime() + consultationMinutes * MINUTE);

    await Token.collection.insertOne({
      tokenNumber: `T-${sequence}`,
      sequenceNumber: sequence,
      serviceDate,
      publicCode: `CODE${String(sequence).padStart(4, '0')}`,
      patient: new mongoose.Types.ObjectId(),
      department: department._id,
      priority: 1,
      status,
      queuedAt,
      calledAt,
      completedAt,
      skippedAt: status === 'skipped' ? completedAt || calledAt : null,
      requeuedAt: null,
      notifiedAt: null,
      createdAt,
      updatedAt: createdAt,
    });
  };

  beforeEach(async () => {
    sequence = 0;
    ({ opd, card } = await seedDepartments());
    ({ adminJwt, opdStaffJwt } = await seedUsers(opd._id));

    // OPD on 10 Oct: two seen, one skipped, one still waiting
    await insertToken({
      department: opd,
      serviceDate: '2026-10-10',
      status: 'completed',
      waitMinutes: 10,
      consultationMinutes: 15,
    });
    await insertToken({
      department: opd,
      serviceDate: '2026-10-10',
      status: 'completed',
      waitMinutes: 20,
      consultationMinutes: 25,
    });
    await insertToken({
      department: opd,
      serviceDate: '2026-10-10',
      status: 'skipped',
      waitMinutes: 30,
    });
    await insertToken({ department: opd, serviceDate: '2026-10-10', status: 'waiting' });

    // Cardiology on 11 Oct
    await insertToken({
      department: card,
      serviceDate: '2026-10-11',
      status: 'completed',
      waitMinutes: 5,
      consultationMinutes: 40,
    });
    await insertToken({
      department: card,
      serviceDate: '2026-10-11',
      status: 'skipped',
      waitMinutes: 5,
    });

    // Well before the range the tests ask for
    await insertToken({
      department: opd,
      serviceDate: '2026-09-01',
      status: 'completed',
      waitMinutes: 90,
      consultationMinutes: 90,
    });
  });

  const get = (path, jwt = adminJwt) => request(app).get(path).set(auth(jwt));

  describe('access', () => {
    it('refuses an anonymous caller', async () => {
      expect((await request(app).get('/api/analytics/overview')).status).toBe(401);
    });

    it('refuses staff — reporting spans every department', async () => {
      expect((await get('/api/analytics/overview', opdStaffJwt)).status).toBe(403);
    });

    it('lets an admin in', async () => {
      expect((await get('/api/analytics/overview')).status).toBe(200);
    });

    it('rejects a malformed date instead of guessing', async () => {
      const res = await get('/api/analytics/overview?from=last-tuesday');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/YYYY-MM-DD/);
    });
  });

  describe('overview', () => {
    it('counts statuses and averages the real durations', async () => {
      const res = await get('/api/analytics/overview?from=2026-10-10&to=2026-10-11');

      expect(res.body.data).toMatchObject({
        tokens: 6,
        completed: 3,
        skipped: 2,
        waiting: 1,
        // 2 skipped of 6
        skipRate: 33.3,
        // waits of 10, 20, 30, 5, 5 — the waiting token has no calledAt
        avgWaitMinutes: 14,
        // consultations of 15, 25 and 40
        avgConsultationMinutes: 26.7,
      });
    });

    it('leaves out tokens outside the range', async () => {
      const everything = await get('/api/analytics/overview?from=2026-09-01&to=2026-10-11');
      expect(everything.body.data.tokens).toBe(7);

      const narrow = await get('/api/analytics/overview?from=2026-10-11&to=2026-10-11');
      expect(narrow.body.data.tokens).toBe(2);
    });

    it('narrows to one department when asked', async () => {
      const res = await get(
        `/api/analytics/overview?from=2026-10-10&to=2026-10-11&departmentId=${card._id}`
      );

      expect(res.body.data).toMatchObject({ tokens: 2, completed: 1, skipped: 1, skipRate: 50 });
    });

    it('reports zeros rather than nulls for an empty range', async () => {
      const res = await get('/api/analytics/overview?from=2020-01-01&to=2020-01-02');

      expect(res.body.data).toMatchObject({ tokens: 0, skipped: 0, skipRate: 0 });
      expect(res.body.data.avgWaitMinutes).toBeNull();
    });

    it('defaults to the last seven days when no range is given', async () => {
      const res = await get('/api/analytics/overview');

      expect(res.body.data.range.from <= res.body.data.range.to).toBe(true);
    });
  });

  describe('tokens per day', () => {
    it('returns one row per department per day', async () => {
      const res = await get('/api/analytics/tokens-per-day?from=2026-10-10&to=2026-10-11');

      expect(res.body.data.rows).toEqual([
        expect.objectContaining({
          date: '2026-10-10',
          departmentCode: 'OPD',
          tokens: 4,
          skipped: 1,
        }),
        expect.objectContaining({
          date: '2026-10-11',
          departmentCode: 'CARD',
          tokens: 2,
          skipped: 1,
        }),
      ]);
    });
  });

  describe('peak hours', () => {
    it('buckets by the hour in IST, not UTC', async () => {
      // 19:00 UTC is 00:30 the next morning in Kolkata
      await insertToken({
        department: opd,
        serviceDate: '2026-10-12',
        status: 'completed',
        waitMinutes: 5,
        consultationMinutes: 5,
        createdAt: new Date('2026-10-12T19:00:00Z'),
      });

      const res = await get('/api/analytics/peak-hours?from=2026-10-12&to=2026-10-12');

      expect(res.body.data.rows).toEqual([expect.objectContaining({ hour: 0, tokens: 1 })]);
      expect(res.body.data.rows[0].weekday).toBeGreaterThanOrEqual(1);
      expect(res.body.data.rows[0].weekday).toBeLessThanOrEqual(7);
    });

    it('names the busiest slot', async () => {
      const res = await get('/api/analytics/peak-hours?from=2026-10-10&to=2026-10-11');

      // Everything else was created at 05:00 UTC, which is 10:30 IST
      expect(res.body.data.busiest).toMatchObject({ hour: 10, tokens: 4 });
    });
  });

  describe('department breakdown', () => {
    it('reports skip rate and both averages per department', async () => {
      const res = await get('/api/analytics/departments?from=2026-10-10&to=2026-10-11');

      const byCode = Object.fromEntries(res.body.data.rows.map((r) => [r.departmentCode, r]));

      expect(byCode.OPD).toMatchObject({
        tokens: 4,
        completed: 2,
        skipped: 1,
        skipRate: 25,
        avgWaitMinutes: 20,
        avgConsultationMinutes: 20,
      });
      expect(byCode.CARD).toMatchObject({ tokens: 2, skipRate: 50, avgConsultationMinutes: 40 });
    });

    it('sorts the busiest department first', async () => {
      const res = await get('/api/analytics/departments?from=2026-10-10&to=2026-10-11');

      expect(res.body.data.rows[0].departmentCode).toBe('OPD');
    });
  });
});
