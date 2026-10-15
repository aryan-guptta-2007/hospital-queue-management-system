const Token = require('../src/models/Token');
const { seedDepartments, issueToken } = require('./helpers/factories');

// Fake the clock but NOT the timers — the MongoDB driver needs real ones
const TIMERS_TO_LEAVE_ALONE = [
  'nextTick',
  'setImmediate',
  'setInterval',
  'setTimeout',
  'clearInterval',
  'clearTimeout',
  'clearImmediate',
  'queueMicrotask',
  'performance',
  'hrtime',
  'requestAnimationFrame',
  'cancelAnimationFrame',
];

// 23:55 and 00:05 India Standard Time, either side of the same midnight
const BEFORE_IST_MIDNIGHT = new Date('2026-10-15T18:25:00Z');
const AFTER_IST_MIDNIGHT = new Date('2026-10-15T18:35:00Z');

describe('daily token sequence (Asia/Kolkata)', () => {
  let opd;

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
    jest.useFakeTimers({ doNotFake: TIMERS_TO_LEAVE_ALONE });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restarts at 001 after IST midnight, with no duplicate key error', async () => {
    jest.setSystemTime(BEFORE_IST_MIDNIGHT);

    const lastOfDayOne = await issueToken(opd, { name: 'Late Evening Patient' });
    expect(lastOfDayOne.tokenNumber).toBe('OPD-001');
    expect(lastOfDayOne.sequenceNumber).toBe(1);
    expect(lastOfDayOne.serviceDate).toBe('2026-10-15');

    // Ten minutes later on the clock, but a new hospital day
    jest.setSystemTime(AFTER_IST_MIDNIGHT);

    const firstOfDayTwo = await issueToken(opd, { name: 'Just After Midnight' });
    expect(firstOfDayTwo.tokenNumber).toBe('OPD-001'); // the number comes round again
    expect(firstOfDayTwo.sequenceNumber).toBe(1);
    expect(firstOfDayTwo.serviceDate).toBe('2026-10-16');

    // Both survive: the old unique index on tokenNumber would have rejected this
    const sameNumber = await Token.find({ tokenNumber: 'OPD-001' }).sort({ serviceDate: 1 });
    expect(sameNumber).toHaveLength(2);
    expect(sameNumber.map((t) => t.serviceDate)).toEqual(['2026-10-15', '2026-10-16']);
  });

  it('keeps counting up within one IST day', async () => {
    jest.setSystemTime(BEFORE_IST_MIDNIGHT);

    const numbers = [];
    for (let i = 0; i < 3; i += 1) {
      numbers.push((await issueToken(opd, { name: `Patient Number ${i}` })).tokenNumber);
    }

    expect(numbers).toEqual(['OPD-001', 'OPD-002', 'OPD-003']);
  });

  it('still refuses two tokens with the same number on the same day', async () => {
    jest.setSystemTime(BEFORE_IST_MIDNIGHT);
    const existing = await issueToken(opd, { name: 'First Patient' });

    await expect(
      Token.create({
        tokenNumber: existing.tokenNumber,
        sequenceNumber: existing.sequenceNumber,
        serviceDate: existing.serviceDate,
        publicCode: 'DUPLICAT',
        patient: existing.patient,
        department: opd._id,
        priority: 1,
      })
    ).rejects.toMatchObject({ code: 11000 });
  });
});
