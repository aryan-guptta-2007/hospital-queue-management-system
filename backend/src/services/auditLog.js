const AuditLog = require('../models/AuditLog');

const { AUDIT_ACTIONS } = AuditLog;

/**
 * Records a staff action.
 *
 * Deliberately forgiving: an audit write must never fail the action it is
 * recording. A failure is logged loudly instead, so a broken log is visible
 * without a staff member losing the patient in front of them.
 *
 * @param {Object} entry
 * @param {Object} entry.user        req.user (the acting staff member)
 * @param {String} entry.action      one of AUDIT_ACTIONS
 * @param {Object} [entry.token]     the token acted on
 * @param {Object} [entry.department]
 * @param {String} [entry.details]   short human-readable context
 */
const record = async ({ user, action, token, department, details }) => {
  try {
    if (!user?._id) {
      console.error(`❌ Audit entry for "${action}" has no user — not recorded`);
      return null;
    }

    return await AuditLog.create({
      user: user._id,
      action,
      token: token?._id || token || null,
      department: department?._id || department || null,
      details: details ? String(details).slice(0, 300) : '',
    });
  } catch (err) {
    console.error(`❌ Could not write audit entry "${action}": ${err.message}`);
    return null;
  }
};

/** Fire-and-forget: the staff member should never wait on the log */
const recordInBackground = (entry) => {
  record(entry).catch(() => {});
};

/**
 * Reads the log newest first.
 *
 * @param {Object} filters  { action, userId, departmentId, from, to, page, limit }
 */
const list = async ({ action, userId, departmentId, from, to, page = 1, limit = 50 } = {}) => {
  const query = {
    ...(action ? { action } : {}),
    ...(userId ? { user: userId } : {}),
    ...(departmentId ? { department: departmentId } : {}),
  };

  if (from || to) {
    query.createdAt = {
      // Dates arrive as IST calendar days; widen to the whole day at each end
      ...(from ? { $gte: new Date(`${from}T00:00:00+05:30`) } : {}),
      ...(to ? { $lte: new Date(`${to}T23:59:59.999+05:30`) } : {}),
    };
  }

  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    AuditLog.find(query)
      .populate('user', 'name email role')
      .populate('department', 'name code')
      .populate('token', 'tokenNumber serviceDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(query),
  ]);

  return {
    entries,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
};

module.exports = { AUDIT_ACTIONS, record, recordInBackground, list };
