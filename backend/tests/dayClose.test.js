const request = require('supertest');
const Token = require('../src/models/Token');
const { TOKEN_STATUS } = require('../src/config/constants');
const { getISTDateString, getISTStartOfDay } = require('../src/utils/date');
const {
  closeStaleTokens,
  scheduleDayClose,
  cancelDayClose,
  getMsUntilNext0001IST,
} = require('../src/services/dayClose');
const { getWaitingQueue } = require('../src/services/queueService');
const { notifyApproachingPatients } = require('../src/services/notifier');
const { app, seedDepartments, seedUsers, issueToken, auth } = require('./helpers/factories');

describe('Day Close Service & Stale Token Handling', () => {
  let opd;
  let adminJwt;
  const today = getISTDateString();
  const yesterday = '2026-10-14'; // Guaranteed past IST date

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
    ({ adminJwt } = await seedUsers(opd._id));
    cancelDayClose();
  });

  afterEach(() => {
    cancelDayClose();
  });

  describe('a token issued yesterday', () => {
    let yesterdayToken;
    let todayToken;

    beforeEach(async () => {
      // Issue a token with yesterday's service date
      yesterdayToken = await issueToken(opd, {
        name: 'Yesterday Patient',
        phone: '9876543210',
        age: 30,
      });
      await Token.updateOne(
        { _id: yesterdayToken._id },
        { serviceDate: yesterday, queuedAt: new Date(Date.now() - 86400000) }
      );

      // Issue a token for today
      todayToken = await issueToken(opd, {
        name: 'Today Patient',
        phone: '9876543211',
        age: 28,
      });
    });

    it('is not in today’s waiting queue', async () => {
      const queue = await getWaitingQueue(opd._id);
      const queueIds = queue.map((t) => String(t._id));

      expect(queueIds).not.toContain(String(yesterdayToken._id));
      expect(queueIds).toContain(String(todayToken._id));

      // Over HTTP as well
      const res = await request(app).get(`/api/queue/${opd._id}`).set(auth(adminJwt));
      expect(res.status).toBe(200);
      const waitingIds = res.body.data.waiting.map((t) => String(t._id));
      expect(waitingIds).not.toContain(String(yesterdayToken._id));
      expect(waitingIds).toContain(String(todayToken._id));

      // And on public display
      const publicRes = await request(app).get(`/api/queue/public/${opd._id}`);
      expect(publicRes.status).toBe(200);
      const publicNextIds = publicRes.body.data.next.map((t) => t.tokenNumber);
      expect(publicNextIds).not.toContain(yesterdayToken.tokenNumber);
      expect(publicNextIds).toContain(todayToken.tokenNumber);
    });

    it('is never called by callNext', async () => {
      // callNext should serve today's token
      const res1 = await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(adminJwt))
        .send({ currentServingId: null });

      expect(res1.status).toBe(200);
      expect(res1.body.data.tokenNumber).toBe(todayToken.tokenNumber);
      expect(res1.body.data.status).toBe(TOKEN_STATUS.SERVING);

      // Calling next again completes today's token and finds no more waiting patients
      const res2 = await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(adminJwt))
        .send({ currentServingId: todayToken._id });

      expect(res2.status).toBe(200);
      expect(res2.body.data).toBeNull();
      expect(res2.body.message).toMatch(/empty/i);

      // Yesterday's token was never called
      const checkYesterday = await Token.findById(yesterdayToken._id);
      expect(checkYesterday.calledAt).toBeNull();
      expect(checkYesterday.status).toBe(TOKEN_STATUS.WAITING);
    });

    it('is never notified', async () => {
      // notifyApproachingPatients should only consider today's waiting queue
      const sent = await notifyApproachingPatients(opd._id);
      const sentTokens = sent.map((s) => s.tokenNumber);

      expect(sentTokens).not.toContain(yesterdayToken.tokenNumber);
      expect(sentTokens).toContain(todayToken.tokenNumber);

      const checkYesterday = await Token.findById(yesterdayToken._id);
      expect(checkYesterday.notifiedAt).toBeNull();
    });
  });

  describe('a token left serving yesterday', () => {
    it('no longer blocks callNext after closeStaleTokens', async () => {
      // Token left serving overnight from yesterday
      const staleServing = await issueToken(opd, { name: 'Overnight Serving Patient' });
      await Token.updateOne(
        { _id: staleServing._id },
        {
          status: TOKEN_STATUS.SERVING,
          calledAt: new Date(Date.now() - 86400000),
          serviceDate: yesterday,
        }
      );

      // Today's patient waiting in queue
      const todayWaiting = await issueToken(opd, { name: 'Morning Patient' });

      // Before closing stale tokens, the database has a token in 'serving'
      const currentlyServing = await Token.findOne({
        department: opd._id,
        status: TOKEN_STATUS.SERVING,
      });
      expect(currentlyServing).not.toBeNull();
      expect(String(currentlyServing._id)).toBe(String(staleServing._id));

      // Close stale tokens
      const expiredCount = await closeStaleTokens(today);
      expect(expiredCount).toBeGreaterThanOrEqual(1);

      // The stale token is now expired
      const updatedStale = await Token.findById(staleServing._id);
      expect(updatedStale.status).toBe(TOKEN_STATUS.EXPIRED);
      expect(updatedStale.expiredAt).toBeInstanceOf(Date);

      // callNext now succeeds without hitting the unique index conflict on serving
      const res = await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(adminJwt))
        .send({ currentServingId: null });

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(String(todayWaiting._id));
      expect(res.body.data.status).toBe(TOKEN_STATUS.SERVING);
    });
  });

  describe('closeStaleTokens idempotence', () => {
    it('running closeStaleTokens twice changes nothing the second time', async () => {
      // Create tokens with various statuses from yesterday
      const tWaiting = await issueToken(opd, { name: 'Yesterday Waiting' });
      await Token.updateOne({ _id: tWaiting._id }, { serviceDate: yesterday });

      const tServing = await issueToken(opd, { name: 'Yesterday Serving' });
      await Token.updateOne(
        { _id: tServing._id },
        { status: TOKEN_STATUS.SERVING, serviceDate: yesterday }
      );

      const tSkipped = await issueToken(opd, { name: 'Yesterday Skipped' });
      await Token.updateOne(
        { _id: tSkipped._id },
        { status: TOKEN_STATUS.SKIPPED, serviceDate: yesterday }
      );

      const tCompleted = await issueToken(opd, { name: 'Yesterday Completed' });
      await Token.updateOne(
        { _id: tCompleted._id },
        { status: TOKEN_STATUS.COMPLETED, serviceDate: yesterday }
      );

      const tMissingDate = await issueToken(opd, { name: 'Legacy Missing Date' });
      await Token.updateOne(
        { _id: tMissingDate._id },
        { $unset: { serviceDate: '' } }
      );

      const tToday = await issueToken(opd, { name: 'Today Token' });

      // First run: should expire waiting, serving, skipped from yesterday and legacy missing date
      const count1 = await closeStaleTokens(today);
      expect(count1).toBe(4);

      // Capture all records
      const snapshotAfterFirst = await Token.find({ department: opd._id }).sort({ _id: 1 }).lean();

      const expiredDoc = snapshotAfterFirst.find((t) => String(t._id) === String(tWaiting._id));
      expect(expiredDoc.status).toBe(TOKEN_STATUS.EXPIRED);
      expect(expiredDoc.expiredAt).toBeInstanceOf(Date);

      const completedDoc = snapshotAfterFirst.find((t) => String(t._id) === String(tCompleted._id));
      expect(completedDoc.status).toBe(TOKEN_STATUS.COMPLETED);

      const todayDoc = snapshotAfterFirst.find((t) => String(t._id) === String(tToday._id));
      expect(todayDoc.status).toBe(TOKEN_STATUS.WAITING);

      // Second run: should find 0 matching tokens and modify nothing
      const count2 = await closeStaleTokens(today);
      expect(count2).toBe(0);

      const snapshotAfterSecond = await Token.find({ department: opd._id }).sort({ _id: 1 }).lean();
      expect(snapshotAfterSecond).toEqual(snapshotAfterFirst);
    });
  });

  describe('next 00:01 IST delay calculation & scheduling', () => {
    it('computes positive delay for both before and after 00:01 IST', () => {
      // 00:00:30 IST today -> target is 00:01:00 IST today (30s delay)
      const midnightIST = getISTStartOfDay();
      const before0001 = new Date(midnightIST.getTime() + 30 * 1000);
      const delayBefore = getMsUntilNext0001IST(before0001);
      expect(delayBefore).toBe(30 * 1000);

      // 00:01:30 IST today -> target is 00:01:00 IST tomorrow (~24h - 30s delay)
      const after0001 = new Date(midnightIST.getTime() + 90 * 1000);
      const delayAfter = getMsUntilNext0001IST(after0001);
      expect(delayAfter).toBe(24 * 60 * 60 * 1000 - 30 * 1000);
    });

    it('schedules timer and calls unref() without throwing', () => {
      const timer = scheduleDayClose();
      expect(timer).toBeDefined();
      expect(typeof timer.unref).toBe('function');
      cancelDayClose();
    });
  });
});
