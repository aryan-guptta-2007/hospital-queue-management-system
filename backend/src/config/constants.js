// ─────────────────────────────────────────────
//  App-wide constants — edit these to tune the system
// ─────────────────────────────────────────────

// Priority levels (higher number = served first)
const PRIORITY = {
  EMERGENCY: 3,
  SENIOR: 2,
  NORMAL: 1,
};

// Human-readable labels for each priority
const PRIORITY_LABELS = {
  3: 'Emergency',
  2: 'Senior Citizen',
  1: 'Normal',
};

// Token status values
const TOKEN_STATUS = {
  WAITING: 'waiting',
  SERVING: 'serving',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
};

// Default consultation time in minutes (used when dept has no override)
const DEFAULT_CONSULTATION_TIME = parseInt(process.env.AVG_CONSULTATION_TIME) || 10;

module.exports = { PRIORITY, PRIORITY_LABELS, TOKEN_STATUS, DEFAULT_CONSULTATION_TIME };
