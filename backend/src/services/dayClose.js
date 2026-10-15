const Token = require('../models/Token');
const { TOKEN_STATUS } = require('../config/constants');
const { getISTDateString, getISTStartOfDay } = require('../utils/date');

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates milliseconds until the next 00:01 IST instant.
 *
 * @param {Date} [now=new Date()]
 * @returns {number} Delay in milliseconds
 */
const getMsUntilNext0001IST = (now = new Date()) => {
  const today0001 = new Date(getISTStartOfDay(now).getTime() + ONE_MINUTE_MS);
  if (now.getTime() < today0001.getTime()) {
    return today0001.getTime() - now.getTime();
  }
  const tomorrow0001 = new Date(today0001.getTime() + ONE_DAY_MS);
  return tomorrow0001.getTime() - now.getTime();
};

/**
 * Expires tokens from previous IST days (or with missing serviceDate)
 * that are still in waiting, serving, or skipped status.
 *
 * Idempotent: repeated runs with the same IST date will find zero matching
 * tokens, modify zero documents, and return 0.
 *
 * @param {string} [todayIST=getISTDateString()] - Today's IST date (YYYY-MM-DD)
 * @returns {Promise<number>} Count of tokens expired
 */
const closeStaleTokens = async (todayIST = getISTDateString()) => {
  const filter = {
    status: { $in: [TOKEN_STATUS.WAITING, TOKEN_STATUS.SERVING, TOKEN_STATUS.SKIPPED] },
    $or: [
      { serviceDate: { $lt: todayIST } },
      { serviceDate: { $exists: false } },
      { serviceDate: null },
    ],
  };

  const now = new Date();
  const result = await Token.updateMany(filter, {
    $set: {
      status: TOKEN_STATUS.EXPIRED,
      expiredAt: now,
    },
  });

  const count = result.modifiedCount || 0;
  console.log(`🧹 Day-close: expired ${count} stale token(s) prior to ${todayIST}`);
  return count;
};

let dayCloseTimer = null;

/**
 * Schedules closeStaleTokens to run at 00:01 IST daily using setTimeout.
 * Calls unref() on the timer so it doesn't hold open the Node process.
 *
 * @returns {NodeJS.Timeout} The timer instance
 */
const scheduleDayClose = () => {
  if (dayCloseTimer) {
    clearTimeout(dayCloseTimer);
    dayCloseTimer = null;
  }

  const delay = getMsUntilNext0001IST();
  dayCloseTimer = setTimeout(async () => {
    try {
      await closeStaleTokens();
    } catch (err) {
      console.error(`❌ Daily day-close failed: ${err.message}`);
    } finally {
      scheduleDayClose();
    }
  }, delay);

  if (typeof dayCloseTimer.unref === 'function') {
    dayCloseTimer.unref();
  }

  return dayCloseTimer;
};

const cancelDayClose = () => {
  if (dayCloseTimer) {
    clearTimeout(dayCloseTimer);
    dayCloseTimer = null;
  }
};

module.exports = {
  closeStaleTokens,
  scheduleDayClose,
  cancelDayClose,
  getMsUntilNext0001IST,
};
