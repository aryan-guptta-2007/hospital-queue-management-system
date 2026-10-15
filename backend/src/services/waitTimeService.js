const Token = require('../models/Token');
const { TOKEN_STATUS } = require('../config/constants');
const { getWaitContext, estimateWait } = require('./queueService');

/**
 * Calculates a single token's estimated wait and queue position.
 * Used when a patient polls their own token status page.
 *
 * The arithmetic itself lives in queueService.estimateWait, so this and the
 * staff queue screens can never drift apart.
 *
 * Counts tokens ahead in queue using two conditions:
 *   - Higher priority tokens (will definitely be served first)
 *   - Same priority but queued earlier (served first within same tier)
 */
const getWaitTimeForToken = async (tokenId) => {
  const token = await Token.findById(tokenId).select('department status priority queuedAt');

  if (!token || token.status !== TOKEN_STATUS.WAITING) {
    return { estimatedWait: 0, estimatedWaitRange: null, position: null };
  }

  // Count all tokens that will be served before this one
  const aheadCount = await Token.countDocuments({
    department: token.department,
    status: TOKEN_STATUS.WAITING,
    $or: [
      // Any token with strictly higher priority
      { priority: { $gt: token.priority } },
      // Same priority but queued earlier (arrival, or requeue time)
      { priority: token.priority, queuedAt: { $lt: token.queuedAt } },
    ],
  });

  const context = await getWaitContext(token.department);
  const { estimatedWaitTime, estimatedWaitRange } = estimateWait({ aheadCount, context });

  return {
    estimatedWait: estimatedWaitTime,
    estimatedWaitRange,
    position: aheadCount + 1,
  };
};

module.exports = { getWaitTimeForToken };
