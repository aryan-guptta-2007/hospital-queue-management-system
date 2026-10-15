const mongoose = require('mongoose');
const Token = require('../models/Token');
const Department = require('../models/Department');
const { TOKEN_STATUS, DEFAULT_CONSULTATION_TIME } = require('../config/constants');
const { getISTStartOfDay, getISTDateString } = require('../utils/date');

/**
 * The one queue order, shared by every read of a queue and by callNext.
 *
 *   1. priority DESC  →  Emergency (3) > Senior Citizen (2) > Normal (1)
 *   2. queuedAt  ASC  →  Earlier arrival wins within the same priority tier.
 *                        queuedAt is the arrival time, or the requeue time for
 *                        a token that was skipped and put back — so a requeued
 *                        patient lands at the END of their priority group
 *                        instead of returning to their original slot.
 *
 * This ensures: a Normal patient who arrived earlier than another Normal patient
 * is served first, but ANY Emergency always jumps ahead of ALL Normal/Senior.
 *
 * Returns a fresh object each call so callers can hand it to Mongoose freely.
 */
const queueSort = () => ({ priority: -1, queuedAt: 1 });

/**
 * Returns the sorted waiting queue for a department.
 */
const getWaitingQueue = async (departmentId) => {
  return Token.find({
    department: departmentId,
    status: TOKEN_STATUS.WAITING,
    serviceDate: getISTDateString(),
  })
    .populate('patient', 'name age phone priority isEmergency')
    .populate('department', 'name code avgConsultationTime')
    .sort(queueSort());
};

// ── Wait-time estimation ──────────────────────────────────────────
// One implementation, used by both the queue screens (calculateWaitTimes) and
// a single patient's status page (waitTimeService.getWaitTimeForToken).

/** Below this many completed consultations today, trust the configured average */
const MIN_SAMPLES = 3;
/** Spread assumed when there is no usable sample yet, as a share of the average */
const DEFAULT_SPREAD_RATIO = 0.25;
/** A range never grows wider than this share of the estimate either side */
const MAX_BAND_RATIO = 0.5;
/** Sanity bounds for a measured average, in minutes */
const MIN_AVG = 2;
const MAX_AVG = 60;

const minutesSince = (date) => (date ? (Date.now() - new Date(date).getTime()) / 60000 : 0);

/**
 * Measures today's actual consultation times for a department in one
 * aggregation: average, spread and sample size.
 *
 * Outliers are trimmed, because both ends are data-entry artefacts rather than
 * real consultations: under a minute is a mis-click, and more than three times
 * the configured average is usually a "complete" button nobody pressed until
 * much later.
 *
 * @returns {Promise<{avgTime: Number, spread: Number, sampleCount: Number}>}
 */
const getConsultationStats = async (departmentId, configuredAvg) => {
  const [stats] = await Token.aggregate([
    {
      $match: {
        department: new mongoose.Types.ObjectId(String(departmentId)),
        status: TOKEN_STATUS.COMPLETED,
        calledAt: { $ne: null },
        completedAt: { $gte: getISTStartOfDay() }, // today, IST
      },
    },
    {
      $project: {
        minutes: { $divide: [{ $subtract: ['$completedAt', '$calledAt'] }, 60000] },
      },
    },
    { $match: { minutes: { $gte: 1, $lte: configuredAvg * 3 } } },
    {
      $group: {
        _id: null,
        avgMinutes: { $avg: '$minutes' },
        stdDevMinutes: { $stdDevPop: '$minutes' },
        sampleCount: { $sum: 1 },
      },
    },
  ]);

  const sampleCount = stats?.sampleCount || 0;

  // Not enough real data yet — the department's configured average stands
  if (sampleCount < MIN_SAMPLES) {
    return {
      avgTime: configuredAvg,
      spread: Math.max(1, Math.round(configuredAvg * DEFAULT_SPREAD_RATIO)),
      sampleCount,
    };
  }

  return {
    avgTime: Math.min(Math.max(Math.ceil(stats.avgMinutes), MIN_AVG), MAX_AVG),
    spread: Math.max(1, Math.round(stats.stdDevMinutes || 0)),
    sampleCount,
  };
};

/**
 * Everything an estimate for this department depends on, fetched once so a
 * whole queue can be priced from a single set of reads.
 *
 * @returns {Promise<{avgTime, spread, sampleCount, activeCounters, remainingForCurrent}>}
 */
const getWaitContext = async (departmentId) => {
  const dept = await Department.findById(departmentId).select(
    'avgConsultationTime activeCounters'
  );

  const configuredAvg = dept?.avgConsultationTime || DEFAULT_CONSULTATION_TIME;
  const activeCounters = Math.max(1, dept?.activeCounters || 1);

  const { avgTime, spread, sampleCount } = await getConsultationStats(departmentId, configuredAvg);

  const serving = await Token.findOne({
    department: departmentId,
    status: TOKEN_STATUS.SERVING,
    serviceDate: getISTDateString(),
  }).select('calledAt');

  // What is actually left of the consultation in progress, measured from when
  // it was called — not a blanket half of the average. An overrunning
  // consultation still reports a minute, never zero or a negative.
  const remainingForCurrent = serving
    ? Math.max(1, Math.ceil(avgTime - minutesSince(serving.calledAt)))
    : 0;

  return { avgTime, spread, sampleCount, activeCounters, remainingForCurrent };
};

/**
 * Turns "how many patients are ahead" into minutes, as a point estimate plus a
 * range, using one department context.
 *
 * Patients ahead are shared between the department's counters. The range comes
 * from how much consultations in this department actually vary: the band grows
 * with the square root of the consultations that must finish first, because
 * independent overruns and underruns partly cancel out rather than stacking up.
 *
 * @param {Object} params
 * @param {Number} params.aheadCount  Patients to be served before this one
 * @param {Object} params.context     From getWaitContext
 */
const estimateWait = ({ aheadCount, context }) => {
  const { avgTime, spread, activeCounters, remainingForCurrent } = context;

  const aheadMinutes = (Math.max(0, aheadCount) * avgTime) / activeCounters;
  const estimatedWaitTime = Math.max(0, Math.ceil(remainingForCurrent + aheadMinutes));

  const consultationsAhead = Math.max(
    1,
    Math.max(0, aheadCount) + (remainingForCurrent > 0 ? 1 : 0)
  );
  const band = Math.min(
    Math.ceil((spread * Math.sqrt(consultationsAhead)) / activeCounters),
    Math.ceil(estimatedWaitTime * MAX_BAND_RATIO)
  );

  return {
    estimatedWaitTime,
    estimatedWaitRange: {
      min: Math.max(0, estimatedWaitTime - band),
      max: estimatedWaitTime + band,
    },
  };
};

/**
 * Enriches a sorted queue with `position`, `estimatedWaitTime` and
 * `estimatedWaitRange`, from a single department context.
 */
const calculateWaitTimes = async (queue, departmentId) => {
  const context = await getWaitContext(departmentId);

  return queue.map((token, index) => ({
    ...token.toObject(),
    position: index + 1,
    ...estimateWait({ aheadCount: index, context }),
  }));
};

/**
 * Fetches the next token to serve — identical sort to getWaitingQueue.
 * Used by callNext controller to find who to serve.
 */
const getNextToken = async (departmentId) => {
  return Token.findOne({
    department: departmentId,
    status: TOKEN_STATUS.WAITING,
    serviceDate: getISTDateString(),
  })
    .populate('patient', 'name age priority isEmergency')
    .populate('department', 'name code')
    .sort(queueSort());
};

module.exports = {
  queueSort,
  getWaitingQueue,
  getConsultationStats,
  getWaitContext,
  estimateWait,
  calculateWaitTimes,
  getNextToken,
};
