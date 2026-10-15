const mongoose = require('mongoose');
const Token = require('../models/Token');
const { TOKEN_STATUS } = require('../config/constants');
const { IST_TIME_ZONE, getISTDateString } = require('../utils/date');

/**
 * Reporting aggregations.
 *
 * Every query filters on Token.serviceDate, the "YYYY-MM-DD" IST date a token
 * belongs to. Because it is stored as a sorted string, a date range is a plain
 * string comparison — no timezone arithmetic, and no tokens drifting into the
 * wrong day because the server runs in UTC.
 */

const MS_PER_MINUTE = 60000;
const MS_PER_DAY = 86400000;
const DEFAULT_RANGE_DAYS = 7;

const minutesBetween = (start, end) => ({
  $divide: [{ $subtract: [end, start] }, MS_PER_MINUTE],
});

/** Average of an interval, counting only the documents that have both ends */
const averageMinutes = (start, end) => ({
  $avg: {
    $cond: [
      { $and: [{ $ne: [start, null] }, { $ne: [end, null] }, { $gt: [end, start] }] },
      minutesBetween(start, end),
      null,
    ],
  },
});

const countWhereStatus = (status) => ({
  $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] },
});

/** Defaults to the last seven IST days, inclusive */
const resolveRange = ({ from, to } = {}) => {
  const end = to || getISTDateString();
  const start =
    from || getISTDateString(new Date(Date.now() - (DEFAULT_RANGE_DAYS - 1) * MS_PER_DAY));

  return start <= end ? { from: start, to: end } : { from: end, to: start };
};

const buildMatch = ({ from, to, departmentId }) => ({
  serviceDate: { $gte: from, $lte: to },
  ...(departmentId ? { department: new mongoose.Types.ObjectId(String(departmentId)) } : {}),
});

const round = (value, places = 1) =>
  value == null ? null : Math.round(value * 10 ** places) / 10 ** places;

/** Headline numbers for the whole range */
const getOverview = async (query) => {
  const range = resolveRange(query);

  const [summary] = await Token.aggregate([
    { $match: buildMatch({ ...range, departmentId: query.departmentId }) },
    {
      $group: {
        _id: null,
        tokens: { $sum: 1 },
        completed: countWhereStatus(TOKEN_STATUS.COMPLETED),
        skipped: countWhereStatus(TOKEN_STATUS.SKIPPED),
        waiting: countWhereStatus(TOKEN_STATUS.WAITING),
        serving: countWhereStatus(TOKEN_STATUS.SERVING),
        avgWaitMinutes: averageMinutes('$queuedAt', '$calledAt'),
        avgConsultationMinutes: averageMinutes('$calledAt', '$completedAt'),
      },
    },
  ]);

  const tokens = summary?.tokens || 0;

  return {
    range,
    tokens,
    completed: summary?.completed || 0,
    skipped: summary?.skipped || 0,
    waiting: summary?.waiting || 0,
    serving: summary?.serving || 0,
    // Share of tokens that were skipped at least once, as a percentage
    skipRate: tokens > 0 ? round(((summary.skipped || 0) / tokens) * 100) : 0,
    avgWaitMinutes: round(summary?.avgWaitMinutes),
    avgConsultationMinutes: round(summary?.avgConsultationMinutes),
  };
};

/** One row per department per day, for the trend chart */
const getTokensPerDay = async (query) => {
  const range = resolveRange(query);

  const rows = await Token.aggregate([
    { $match: buildMatch({ ...range, departmentId: query.departmentId }) },
    {
      $group: {
        _id: { date: '$serviceDate', department: '$department' },
        tokens: { $sum: 1 },
        skipped: countWhereStatus(TOKEN_STATUS.SKIPPED),
      },
    },
    {
      $lookup: {
        from: 'departments',
        localField: '_id.department',
        foreignField: '_id',
        as: 'department',
      },
    },
    { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        date: '$_id.date',
        departmentId: '$_id.department',
        departmentName: '$department.name',
        departmentCode: '$department.code',
        tokens: 1,
        skipped: 1,
      },
    },
    { $sort: { date: 1, departmentCode: 1 } },
  ]);

  return { range, rows };
};

/**
 * Counts by IST weekday and hour, for the heatmap.
 * MongoDB does the timezone conversion, so a 00:30 IST token counts as
 * Monday 00:00 rather than Sunday 19:00 UTC.
 */
const getPeakHours = async (query) => {
  const range = resolveRange(query);

  const rows = await Token.aggregate([
    { $match: buildMatch({ ...range, departmentId: query.departmentId }) },
    {
      $group: {
        _id: {
          // 1 = Monday … 7 = Sunday
          weekday: { $isoDayOfWeek: { date: '$createdAt', timezone: IST_TIME_ZONE } },
          hour: { $hour: { date: '$createdAt', timezone: IST_TIME_ZONE } },
        },
        tokens: { $sum: 1 },
      },
    },
    {
      $project: { _id: 0, weekday: '$_id.weekday', hour: '$_id.hour', tokens: 1 },
    },
    { $sort: { weekday: 1, hour: 1 } },
  ]);

  const busiest = rows.reduce((top, row) => (!top || row.tokens > top.tokens ? row : top), null);

  return { range, rows, busiest };
};

/** Per-department totals, wait, consultation time and skip rate */
const getDepartmentBreakdown = async (query) => {
  const range = resolveRange(query);

  const rows = await Token.aggregate([
    { $match: buildMatch({ ...range, departmentId: query.departmentId }) },
    {
      $group: {
        _id: '$department',
        tokens: { $sum: 1 },
        completed: countWhereStatus(TOKEN_STATUS.COMPLETED),
        skipped: countWhereStatus(TOKEN_STATUS.SKIPPED),
        avgWaitMinutes: averageMinutes('$queuedAt', '$calledAt'),
        avgConsultationMinutes: averageMinutes('$calledAt', '$completedAt'),
      },
    },
    {
      $lookup: {
        from: 'departments',
        localField: '_id',
        foreignField: '_id',
        as: 'department',
      },
    },
    { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        departmentId: '$_id',
        departmentName: '$department.name',
        departmentCode: '$department.code',
        tokens: 1,
        completed: 1,
        skipped: 1,
        avgWaitMinutes: 1,
        avgConsultationMinutes: 1,
        skipRate: {
          $cond: [
            { $gt: ['$tokens', 0] },
            { $multiply: [{ $divide: ['$skipped', '$tokens'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { tokens: -1 } },
  ]);

  return {
    range,
    rows: rows.map((row) => ({
      ...row,
      avgWaitMinutes: round(row.avgWaitMinutes),
      avgConsultationMinutes: round(row.avgConsultationMinutes),
      skipRate: round(row.skipRate),
    })),
  };
};

module.exports = {
  DEFAULT_RANGE_DAYS,
  resolveRange,
  getOverview,
  getTokensPerDay,
  getPeakHours,
  getDepartmentBreakdown,
};
