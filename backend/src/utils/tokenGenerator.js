const crypto = require('crypto');
const Counter = require('../models/Counter');
const { getISTDateString } = require('./date');

// 32 unambiguous characters — no I/L/O, so a patient can read a code aloud.
// Exactly 256/32 = 8 bytes map to each character, so modulo stays unbiased.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ023456789';
const CODE_LENGTH = 8;

/**
 * Generates the next token number for a department on today's IST date.
 * Format: "<DEPT_CODE>-<3-digit-sequence>"  e.g. "OPD-001", "CARD-042"
 *
 * The sequence restarts at 1 each IST day. It comes from an atomic $inc on a
 * per-department-per-day counter, so concurrent requests never share a number.
 */
const generateToken = async (departmentCode, departmentId) => {
  const serviceDate = getISTDateString();

  const counter = await Counter.findOneAndUpdate(
    { _id: `${departmentId}:${serviceDate}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  const sequenceNumber = counter.seq;

  // Zero-pad to 3 digits: 1 → "001", 42 → "042"
  const paddedSeq = String(sequenceNumber).padStart(3, '0');
  const tokenNumber = `${departmentCode.toUpperCase()}-${paddedSeq}`;

  return { tokenNumber, sequenceNumber, serviceDate };
};

/**
 * Random, unguessable handle a patient uses to reopen their own status page.
 * The token number itself is guessable (OPD-001), so it must not be the key.
 */
const generatePublicCode = () =>
  Array.from(crypto.randomBytes(CODE_LENGTH))
    .map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
    .join('');

module.exports = { generateToken, generatePublicCode };
