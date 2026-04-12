const Token = require('../models/Token');

/**
 * Generates the next token number for a department on today's date.
 * Format: "<DEPT_CODE>-<3-digit-sequence>"  e.g. "OPD-001", "CARD-042"
 *
 * Tokens reset to 001 every day (counts only today's tokens).
 */
const generateToken = async (departmentCode, departmentId) => {
  // Start of today (midnight)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Count how many tokens were generated for this dept today
  const todayCount = await Token.countDocuments({
    department: departmentId,
    createdAt: { $gte: startOfDay },
  });

  const sequenceNumber = todayCount + 1;

  // Zero-pad to 3 digits: 1 → "001", 42 → "042"
  const paddedSeq = String(sequenceNumber).padStart(3, '0');
  const tokenNumber = `${departmentCode.toUpperCase()}-${paddedSeq}`;

  return { tokenNumber, sequenceNumber };
};

module.exports = { generateToken };
