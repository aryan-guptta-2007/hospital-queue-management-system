const {
  getOverview,
  getTokensPerDay,
  getPeakHours,
  getDepartmentBreakdown,
} = require('../services/analyticsService');

/**
 * Reporting for administrators. Every handler takes the same optional query:
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD&departmentId=<id>
 * and defaults to the last seven IST days.
 */

const handle = (load) => async (req, res, next) => {
  try {
    res.json({ success: true, data: await load(req.query) });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/analytics/overview ───────────────────────────
const overview = handle(getOverview);

// ── GET /api/analytics/tokens-per-day ─────────────────────
const tokensPerDay = handle(getTokensPerDay);

// ── GET /api/analytics/peak-hours ─────────────────────────
const peakHours = handle(getPeakHours);

// ── GET /api/analytics/departments ────────────────────────
const departments = handle(getDepartmentBreakdown);

module.exports = { overview, tokensPerDay, peakHours, departments };
