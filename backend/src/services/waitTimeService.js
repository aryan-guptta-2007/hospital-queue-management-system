const Token = require('../models/Token');
const Department = require('../models/Department');
const { TOKEN_STATUS, DEFAULT_CONSULTATION_TIME } = require('../config/constants');
const { getDynamicAvgTime } = require('./queueService');

/**
 * Calculates a single token's estimated wait time and queue position.
 * Used when a patient polls their own token status page.
 *
 * Counts tokens ahead in queue using two conditions:
 *   - Higher priority tokens (will definitely be served first)
 *   - Same priority but arrived earlier (served first within same tier)
 */
const getWaitTimeForToken = async (tokenId) => {
  const token = await Token.findById(tokenId).populate('department');
  if (!token || token.status !== TOKEN_STATUS.WAITING) return { estimatedWait: 0, position: null };

  const configuredAvg = token.department?.avgConsultationTime || DEFAULT_CONSULTATION_TIME;
  const avgTime = await getDynamicAvgTime(token.department._id, configuredAvg);

  // Count all tokens that will be served before this one
  const aheadCount = await Token.countDocuments({
    department: token.department._id,
    status: TOKEN_STATUS.WAITING,
    $or: [
      // Any token with strictly higher priority
      { priority: { $gt: token.priority } },
      // Same priority but registered earlier
      { priority: token.priority, createdAt: { $lt: token.createdAt } },
    ],
  });

  const serving = await Token.findOne({
    department: token.department._id,
    status: TOKEN_STATUS.SERVING,
  });

  const currentServeTimeLeft = serving ? Math.ceil(avgTime / 2) : 0;
  const estimatedWait = currentServeTimeLeft + aheadCount * avgTime;

  return { estimatedWait, position: aheadCount + 1 };
};

module.exports = { getWaitTimeForToken };
