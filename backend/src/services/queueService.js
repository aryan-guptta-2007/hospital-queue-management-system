const Token = require('../models/Token');
const Department = require('../models/Department');
const { TOKEN_STATUS, DEFAULT_CONSULTATION_TIME } = require('../config/constants');

/**
 * Returns the sorted waiting queue for a department.
 *
 * Priority Queue Sort Order:
 *   1. priority DESC  →  Emergency (3) > Senior Citizen (2) > Normal (1)
 *   2. createdAt ASC  →  Earlier arrival wins within same priority tier
 *
 * This ensures: a Normal patient who arrived earlier than another Normal patient
 * is served first, but ANY Emergency always jumps ahead of ALL Normal/Senior.
 */
const getWaitingQueue = async (departmentId) => {
  return Token.find({
    department: departmentId,
    status: TOKEN_STATUS.WAITING,
  })
    .populate('patient', 'name age phone priority isEmergency')
    .populate('department', 'name code avgConsultationTime')
    .sort({ priority: -1, createdAt: 1 });
};

/**
 * Calculates a DYNAMIC average consultation time for a department
 * based on actual completed tokens from today.
 *
 * Falls back to the department's configured avg if fewer than 3 samples exist.
 * This makes wait times progressively more accurate throughout the day.
 */
const getDynamicAvgTime = async (departmentId, configuredAvg) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Find completed tokens today that have both calledAt and completedAt
  const completed = await Token.find({
    department: departmentId,
    status: TOKEN_STATUS.COMPLETED,
    calledAt: { $ne: null },
    completedAt: { $gte: startOfDay },
  }).select('calledAt completedAt');

  if (completed.length < 3) return configuredAvg; // Not enough data yet

  // Calculate average actual consultation duration in minutes
  const totalMinutes = completed.reduce((sum, t) => {
    const diffMs = new Date(t.completedAt) - new Date(t.calledAt);
    return sum + diffMs / 60000;
  }, 0);

  const dynamicAvg = Math.ceil(totalMinutes / completed.length);

  // Cap between 2 and 60 minutes to avoid outlier distortion
  return Math.min(Math.max(dynamicAvg, 2), 60);
};

/**
 * Calculates estimated wait time for each token in the queue.
 * Returns enriched array with `estimatedWaitTime` (minutes) and `position`.
 *
 * Formula per position i (0-indexed):
 *   waitTime[0] = timeLeftForCurrentPatient   (half of avgTime if someone is serving)
 *   waitTime[i] = waitTime[0] + i * avgTime
 */
const calculateWaitTimes = async (queue, departmentId) => {
  const dept = await Department.findById(departmentId);
  const configuredAvg = dept?.avgConsultationTime || DEFAULT_CONSULTATION_TIME;

  // Use dynamic avg based on today's actual data (improves accuracy over time)
  const avgTime = await getDynamicAvgTime(departmentId, configuredAvg);

  const serving = await Token.findOne({
    department: departmentId,
    status: TOKEN_STATUS.SERVING,
  });

  // If a patient is being served, assume half their consultation time has passed
  const currentServeTimeLeft = serving ? Math.ceil(avgTime / 2) : 0;

  return queue.map((token, index) => {
    const waitTime = index === 0
      ? currentServeTimeLeft
      : currentServeTimeLeft + index * avgTime;

    return {
      ...token.toObject(),
      position: index + 1,
      estimatedWaitTime: waitTime,
    };
  });
};

/**
 * Fetches the next token to serve — identical sort to getWaitingQueue.
 * Used by callNext controller to find who to serve.
 */
const getNextToken = async (departmentId) => {
  return Token.findOne({
    department: departmentId,
    status: TOKEN_STATUS.WAITING,
  })
    .populate('patient', 'name age priority isEmergency')
    .populate('department', 'name code')
    .sort({ priority: -1, createdAt: 1 });
};

module.exports = { getWaitingQueue, calculateWaitTimes, getNextToken, getDynamicAvgTime };
