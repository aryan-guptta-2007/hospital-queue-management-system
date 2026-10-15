const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Token = require('../models/Token');
const { generateToken, generatePublicCode } = require('../utils/tokenGenerator');

const DUPLICATE_KEY = 11000;
const MAX_CODE_ATTEMPTS = 3;

// Standalone mongod can't run transactions; probed once, then remembered
let transactionsSupported = null;

const isUnsupportedTransaction = (err) =>
  err?.code === 20 ||
  err?.codeName === 'IllegalOperation' ||
  /transaction numbers are only allowed|transactions are not supported|replica set/i.test(
    err?.message || ''
  );

const isDuplicatePublicCode = (err) =>
  err?.code === DUPLICATE_KEY && /publicCode/.test(JSON.stringify(err.keyPattern || err.keyValue || {}));

// Counter increments deliberately stay outside any transaction: a rolled-back
// token should not hand its sequence number to the next patient.
const buildTokenDoc = async ({ department, priority, note }, patient) => {
  const { tokenNumber, sequenceNumber, serviceDate } = await generateToken(
    department.code,
    department._id
  );

  return {
    tokenNumber,
    sequenceNumber,
    serviceDate,
    publicCode: generatePublicCode(),
    patient: patient._id,
    department: department._id,
    priority: priority ?? patient.priority,
    note: note || '',
  };
};

const issueInTransaction = async (args) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const [patient] = await Patient.create([args.patientData], { session });
      const [token] = await Token.create([await buildTokenDoc(args, patient)], { session });
      result = { patient, token };
    });
    return result;
  } finally {
    session.endSession();
  }
};

const issueWithCompensation = async (args) => {
  const patient = await Patient.create(args.patientData);
  try {
    const token = await Token.create(await buildTokenDoc(args, patient));
    return { patient, token };
  } catch (err) {
    // Never leave an orphan patient behind when the token write fails
    await Patient.deleteOne({ _id: patient._id }).catch(() => {});
    throw err;
  }
};

const runIssue = async (args) => {
  if (transactionsSupported === false) return issueWithCompensation(args);

  try {
    const result = await issueInTransaction(args);
    transactionsSupported = true;
    return result;
  } catch (err) {
    if (!isUnsupportedTransaction(err)) throw err;
    // Single-node deployment — fall back to compensating delete from now on
    transactionsSupported = false;
    return issueWithCompensation(args);
  }
};

/**
 * Creates a Patient and its Token together, so a failed token write never
 * leaves an orphan patient record.
 *
 * @param {Object}  args
 * @param {Object}  args.department   Department document (needs _id and code)
 * @param {Object}  args.patientData  Fields for Patient.create
 * @param {Number} [args.priority]    Overrides the patient's own priority
 * @param {String} [args.note]        Admin note stored on the token
 * @returns {Promise<{ patient: Object, token: Object }>}
 */
const issuePatientToken = async (args) => {
  let lastErr;

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await runIssue(args);
    } catch (err) {
      lastErr = err;
      // A publicCode collision is pure bad luck — generate another one
      if (!isDuplicatePublicCode(err)) throw err;
    }
  }

  throw lastErr;
};

module.exports = { issuePatientToken };
