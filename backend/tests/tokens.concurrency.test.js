const Patient = require('../src/models/Patient');
const { seedDepartments, generateToken } = require('./helpers/factories');

describe('concurrent token generation', () => {
  let opd;

  beforeEach(async () => {
    ({ opd } = await seedDepartments());
  });

  it('gives 20 simultaneous requests 20 unique sequential numbers', async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        generateToken(opd._id, { name: `Patient Number ${i}`, age: 30 })
      )
    );

    expect(responses.map((r) => r.status)).toEqual(Array(20).fill(201));

    const tokens = responses.map((r) => r.body.data);
    const sequences = tokens.map((t) => t.sequenceNumber).sort((a, b) => a - b);

    // Exactly 1..20, so no number was handed out twice and none was skipped
    expect(sequences).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(new Set(tokens.map((t) => t.tokenNumber)).size).toBe(20);
    expect(new Set(tokens.map((t) => t.publicCode)).size).toBe(20);
    expect(tokens.every((t) => t.serviceDate === tokens[0].serviceDate)).toBe(true);
  });

  it('leaves no orphan patient when the token write fails', async () => {
    const before = await Patient.countDocuments();

    // age 500 is rejected by validation before any write happens
    const rejected = await generateToken(opd._id, { name: 'Impossible Patient', age: 500 });
    expect(rejected.status).toBe(400);

    expect(await Patient.countDocuments()).toBe(before);
  });
});
