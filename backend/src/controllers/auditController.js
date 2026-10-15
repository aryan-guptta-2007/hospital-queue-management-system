const { list, AUDIT_ACTIONS } = require('../services/auditLog');

// ── GET /api/audit ────────────────────────────────────────
// Admin — the staff action log, newest first
const getAuditLog = async (req, res, next) => {
  try {
    const { action, userId, departmentId, from, to } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const result = await list({ action, userId, departmentId, from, to, page, limit });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/audit/actions ────────────────────────────────
// Admin — the action names, so the filter does not hardcode them
const getAuditActions = (req, res) => {
  res.json({ success: true, data: Object.values(AUDIT_ACTIONS) });
};

module.exports = { getAuditLog, getAuditActions };
