const request = require('supertest');
const Token = require('../src/models/Token');
const { sendSms, buildMessage, notifyApproachingPatients } = require('../src/services/notifier');
const { app, seedDepartments, seedUsers, issueToken, auth } = require('./helpers/factories');

const PHONE = '9876543210';

describe('patient notifications', () => {
  let opd;
  let adminJwt;
  let logged;

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
    ({ adminJwt } = await seedUsers(opd._id));

    delete process.env.SMS_PROVIDER;
    logged = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const messages = () => logged.mock.calls.map(([line]) => line).filter((l) => l.includes('[sms:'));

  describe('the transport', () => {
    it('logs rather than sending anything by default', async () => {
      const result = await sendSms(PHONE, 'Hello from the hospital');

      expect(result).toMatchObject({ provider: 'console', delivered: true });
      expect(messages()[0]).toContain('+919876543210');
      expect(messages()[0]).toContain('Hello from the hospital');
    });

    it('normalises however the patient typed their number', async () => {
      await sendSms('+91 98765 43210', 'one');
      await sendSms('098765-43210', 'two');

      expect(messages().every((line) => line.includes('+919876543210'))).toBe(true);
    });

    it('falls back to the console provider when one is unknown', async () => {
      process.env.SMS_PROVIDER = 'carrier-pigeon';

      const result = await sendSms(PHONE, 'Hello');

      expect(result.provider).toBe('console');
    });

    it('falls back when a real provider has no credentials, instead of failing', async () => {
      process.env.SMS_PROVIDER = 'twilio';

      // No TWILIO_* variables are set, so nothing should reach the network
      const result = await sendSms(PHONE, 'Hello');

      expect(result.provider).toBe('console');
    });

    it('writes a message a patient can act on', () => {
      expect(
        buildMessage({ tokenNumber: 'OPD-042', position: 3, departmentName: 'Cardiology' })
      ).toBe(
        'Hospital Queue: token OPD-042 is number 3 in the queue for Cardiology. Please reach the waiting area.'
      );
    });
  });

  describe('deciding who to tell', () => {
    it('messages the patients nearest the front, once each', async () => {
      const first = await issueToken(opd, { name: 'Arun Sharma', phone: PHONE });
      const second = await issueToken(opd, { name: 'Bimal Roy', phone: '9811122233' });
      const third = await issueToken(opd, { name: 'Chetan Patil', phone: '9700011122' });
      const fourth = await issueToken(opd, { name: 'Divya Nair', phone: '9633344455' });

      const sent = await notifyApproachingPatients(opd._id);

      expect(sent.map((s) => s.tokenNumber)).toEqual([
        first.tokenNumber,
        second.tokenNumber,
        third.tokenNumber,
      ]);
      expect(sent.map((s) => s.position)).toEqual([1, 2, 3]);

      // The fourth in line is not close enough yet
      expect((await Token.findById(fourth._id)).notifiedAt).toBeNull();
      expect((await Token.findById(first._id)).notifiedAt).toBeInstanceOf(Date);
    });

    it('never messages the same token twice', async () => {
      await issueToken(opd, { name: 'Arun Sharma', phone: PHONE });

      expect(await notifyApproachingPatients(opd._id)).toHaveLength(1);
      expect(await notifyApproachingPatients(opd._id)).toHaveLength(0);
      expect(await notifyApproachingPatients(opd._id)).toHaveLength(0);

      expect(messages()).toHaveLength(1);
    });

    it('skips a patient who gave no phone number, and leaves them notifiable', async () => {
      const withoutPhone = await issueToken(opd, { name: 'No Phone Patient', phone: '' });
      const withPhone = await issueToken(opd, { name: 'Has Phone Patient', phone: PHONE });

      const sent = await notifyApproachingPatients(opd._id);

      expect(sent.map((s) => s.tokenNumber)).toEqual([withPhone.tokenNumber]);
      expect((await Token.findById(withoutPhone._id)).notifiedAt).toBeNull();
    });

    it('messages a patient only once they move up the queue', async () => {
      // Five ahead, so this patient starts at position 6
      for (let i = 0; i < 5; i += 1) {
        await issueToken(opd, { name: `Ahead Patient ${i}`, phone: '' });
      }
      const watched = await issueToken(opd, { name: 'Watched Patient', phone: PHONE });

      await notifyApproachingPatients(opd._id);
      expect((await Token.findById(watched._id)).notifiedAt).toBeNull();

      // Three patients seen, so the watched one is now third in line. Done
      // through the model rather than the API, because the API would notify
      // in the background and this test is about the decision, not the wiring.
      const ahead = await Token.find({ department: opd._id, status: 'waiting' })
        .sort({ queuedAt: 1 })
        .limit(3);
      await Token.updateMany(
        { _id: { $in: ahead.map((t) => t._id) } },
        { status: 'completed', completedAt: new Date() }
      );

      const sent = await notifyApproachingPatients(opd._id);

      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ tokenNumber: watched.tokenNumber, position: 3 });
    });

    it('does not chase a patient who has already been called', async () => {
      await issueToken(opd, { name: 'Arun Sharma', phone: PHONE });

      await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(adminJwt))
        .send({ currentServingId: null });

      // They are being seen now, not waiting
      expect(await notifyApproachingPatients(opd._id)).toHaveLength(0);
    });
  });

  describe('wired into the queue', () => {
    const waitFor = async (check, timeout = 2000) => {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (await check()) return true;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      return false;
    };

    it('notifies in the background when staff call the next patient', async () => {
      await issueToken(opd, { name: 'Being Served', phone: '' });
      const watched = await issueToken(opd, { name: 'Watched Patient', phone: PHONE });

      await request(app)
        .post(`/api/queue/${opd._id}/next`)
        .set(auth(adminJwt))
        .send({ currentServingId: null });

      const notified = await waitFor(async () => (await Token.findById(watched._id)).notifiedAt);

      expect(notified).toBe(true);
    });

    it('notifies a patient who registers straight into a short queue', async () => {
      const res = await request(app)
        .post('/api/tokens/generate')
        .send({ name: 'Walk In Patient', age: 30, phone: PHONE, departmentId: opd._id });

      expect(res.status).toBe(201);

      const notified = await waitFor(
        async () => (await Token.findById(res.body.data._id)).notifiedAt
      );

      expect(notified).toBe(true);
    });
  });
});
