const Token = require('../models/Token');
const Department = require('../models/Department');
const { getWaitingQueue, calculateWaitTimes, queueSort } = require('../services/queueService');
const {
  statusGuard,
  transitionConflict,
  queueChangedConflict,
} = require('../services/tokenState');
const { getISTDateString } = require('../utils/date');
const { toPublicToken } = require('../utils/publicView');
const { notifyApproachingPatientsInBackground } = require('../services/notifier');
const { recordInBackground, AUDIT_ACTIONS } = require('../services/auditLog');
const { broadcast: publish } = require('../realtime/socket');
const { issuePatientToken } = require('../services/tokenIssueService');
const { createError } = require('../middleware/errorHandler');
const { TOKEN_STATUS, PRIORITY } = require('../config/constants');

// ── Helper: department scoping ─────────────────────────────
// A staff user with `department` set may only touch that department's queue.
// Admins and staff with department = null may access every department.
const assertDepartmentAccess = (req, departmentId) => {
  const scope = req.user?.department;
  if (req.user?.role === 'admin' || !scope) return;

  if (String(scope) !== String(departmentId)) {
    throw createError('Forbidden. You can only access your own department.', 403);
  }
};

// ── Helper: a guarded update matched nothing — report what it really is ──
const conflictFor = async (tokenId, target) => {
  const current = await Token.findById(tokenId).select('status tokenNumber');
  return transitionConflict(target, current);
};

// ── Helper: broadcast after any queue change ───────────────
const broadcast = (type, departmentId, extra = {}) => {
  // Reaches only the clients subscribed to this department
  publish(departmentId, { type, ...extra });
};

// ── GET /api/queue/:departmentId ──────────────────────────
// Admin — full sorted queue with wait times
const getQueue = async (req, res, next) => {
  try {
    assertDepartmentAccess(req, req.params.departmentId);

    const queue = await getWaitingQueue(req.params.departmentId);
    const queueWithWaitTimes = await calculateWaitTimes(queue, req.params.departmentId);

    // Also return the currently-serving token
    const serving = await Token.findOne({
      department: req.params.departmentId,
      status: TOKEN_STATUS.SERVING,
      serviceDate: getISTDateString(),
    }).populate('patient', 'name age priority');

    // Today's skipped tokens, so staff can requeue a patient who turns up late
    const skipped = await Token.find({
      department: req.params.departmentId,
      status: TOKEN_STATUS.SKIPPED,
      serviceDate: getISTDateString(),
    })
      .populate('patient', 'name age priority')
      .sort({ skippedAt: -1 });

    res.json({
      success: true,
      data: {
        serving: serving || null,
        waiting: queueWithWaitTimes,
        waitingCount: queueWithWaitTimes.length,
        skipped,
        skippedCount: skipped.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/:departmentId/next ────────────────────
// Admin — complete the consultation the staff member is looking at, then call
// the next patient (highest priority, earliest queued).
//
// The client sends `currentServingId` (or null) — the serving token it has on
// screen. If that no longer matches the queue, nothing is written: a stale
// screen must never end a consultation that somebody else already moved on.
const callNext = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    assertDepartmentAccess(req, departmentId);

    const claimedId = req.body?.currentServingId ? String(req.body.currentServingId) : null;

    const serving = await Token.findOne({
      department: departmentId,
      status: TOKEN_STATUS.SERVING,
      serviceDate: getISTDateString(),
    }).select('_id');

    const actualId = serving ? String(serving._id) : null;
    if (claimedId !== actualId) throw queueChangedConflict();

    if (claimedId) {
      const completed = await Token.findOneAndUpdate(
        { _id: claimedId, status: statusGuard(TOKEN_STATUS.COMPLETED) },
        { status: TOKEN_STATUS.COMPLETED, completedAt: new Date() }
      );

      // Completed or skipped by someone else between the read and this write
      if (!completed) throw queueChangedConflict();
    }

    // Get highest priority waiting token
    let nextToken;
    try {
      nextToken = await Token.findOneAndUpdate(
        {
          department: departmentId,
          status: statusGuard(TOKEN_STATUS.SERVING),
          serviceDate: getISTDateString(),
        },
        { status: TOKEN_STATUS.SERVING, calledAt: new Date() },
        { new: true, sort: queueSort() }
      ).populate('patient', 'name age priority isEmergency')
       .populate('department', 'name code');
    } catch (err) {
      // The one-serving-per-department index refused this: another staff
      // member called next at the same moment
      if (err?.code === 11000) throw queueChangedConflict();
      throw err;
    }

    if (!nextToken) {
      recordInBackground({
        user: req.user,
        action: AUDIT_ACTIONS.CALL_NEXT,
        department: departmentId,
        details: 'Queue empty',
      });

      return res.json({ success: true, message: 'Queue is empty', data: null });
    }

    recordInBackground({
      user: req.user,
      action: AUDIT_ACTIONS.CALL_NEXT,
      token: nextToken,
      department: departmentId,
      details: `Called ${nextToken.tokenNumber}`,
    });

    broadcast('NEXT_TOKEN', departmentId, { data: toPublicToken(nextToken) });
    // Everyone behind just moved up one
    notifyApproachingPatientsInBackground(departmentId);

    res.json({ success: true, message: 'Next patient called', data: nextToken });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/token/:tokenId/skip ───────────────────
// Admin — skip a patient (they move to end of same-priority group)
const skipToken = async (req, res, next) => {
  try {
    const existing = await Token.findById(req.params.tokenId).select('department');
    if (!existing) throw createError('Token not found', 404);
    assertDepartmentAccess(req, existing.department);

    const token = await Token.findOneAndUpdate(
      {
        _id: req.params.tokenId,
        status: statusGuard(TOKEN_STATUS.SKIPPED),
      },
      {
        status: TOKEN_STATUS.SKIPPED,
        skippedAt: new Date(),
      },
      { new: true }
    ).populate('patient', 'name');

    if (!token) throw await conflictFor(req.params.tokenId, TOKEN_STATUS.SKIPPED);

    recordInBackground({
      user: req.user,
      action: AUDIT_ACTIONS.SKIP,
      token,
      department: token.department,
      details: `Skipped ${token.tokenNumber}`,
    });

    broadcast('TOKEN_SKIPPED', token.department, { tokenId: token._id });
    notifyApproachingPatientsInBackground(token.department);

    res.json({ success: true, message: `Token ${token.tokenNumber} skipped`, data: token });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/token/:tokenId/complete ───────────────
// Admin — manually mark consultation as done
const completeToken = async (req, res, next) => {
  try {
    const existing = await Token.findById(req.params.tokenId).select('department');
    if (!existing) throw createError('Token not found', 404);
    assertDepartmentAccess(req, existing.department);

    const token = await Token.findOneAndUpdate(
      {
        _id: req.params.tokenId,
        status: statusGuard(TOKEN_STATUS.COMPLETED),
      },
      { status: TOKEN_STATUS.COMPLETED, completedAt: new Date() },
      { new: true }
    ).populate('patient', 'name');

    if (!token) throw await conflictFor(req.params.tokenId, TOKEN_STATUS.COMPLETED);

    recordInBackground({
      user: req.user,
      action: AUDIT_ACTIONS.COMPLETE,
      token,
      department: token.department,
      details: `Completed ${token.tokenNumber}`,
    });

    broadcast('TOKEN_COMPLETED', token.department, { tokenId: token._id });
    notifyApproachingPatientsInBackground(token.department);

    res.json({ success: true, message: `Token ${token.tokenNumber} completed`, data: token });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/token/:tokenId/requeue ────────────────
// Admin — a skipped patient turned up after all. They go back to the END of
// their priority group (queuedAt moves to now), not to their original slot.
const requeueToken = async (req, res, next) => {
  try {
    const existing = await Token.findById(req.params.tokenId).select('department');
    if (!existing) throw createError('Token not found', 404);
    assertDepartmentAccess(req, existing.department);

    const now = new Date();

    const token = await Token.findOneAndUpdate(
      {
        _id: req.params.tokenId,
        status: statusGuard(TOKEN_STATUS.WAITING),
      },
      {
        status: TOKEN_STATUS.WAITING,
        requeuedAt: now,
        queuedAt: now, // what the shared queue sort orders on
      },
      { new: true }
    ).populate('patient', 'name age priority');

    if (!token) throw await conflictFor(req.params.tokenId, TOKEN_STATUS.WAITING);

    recordInBackground({
      user: req.user,
      action: AUDIT_ACTIONS.REQUEUE,
      token,
      department: token.department,
      details: `Requeued ${token.tokenNumber}`,
    });

    broadcast('TOKEN_REQUEUED', token.department, { tokenId: token._id });
    notifyApproachingPatientsInBackground(token.department);

    res.json({
      success: true,
      message: `Token ${token.tokenNumber} moved back into the queue`,
      data: token,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/:departmentId/recall ──────────────────
// Admin — re-announce the token already being served, for a patient who did
// not respond the first time. Changes no state, only re-broadcasts.
const recallToken = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    assertDepartmentAccess(req, departmentId);

    const serving = await Token.findOne({
      department: departmentId,
      status: TOKEN_STATUS.SERVING,
      serviceDate: getISTDateString(),
    })
      .populate('patient', 'name age priority isEmergency')
      .populate('department', 'name code');

    if (!serving)
      throw createError('No patient is currently being served in this department.', 409);

    recordInBackground({
      user: req.user,
      action: AUDIT_ACTIONS.RECALL,
      token: serving,
      department: departmentId,
      details: `Recalled ${serving.tokenNumber}`,
    });

    broadcast('TOKEN_RECALLED', departmentId, { data: toPublicToken(serving) });

    res.json({
      success: true,
      message: `Token ${serving.tokenNumber} recalled`,
      data: serving,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/:departmentId/emergency ───────────────
// Admin — insert an emergency patient directly to front of queue
const insertEmergency = async (req, res, next) => {
  try {
    const { name, phone, age, note } = req.body;
    const { departmentId } = req.params;
    assertDepartmentAccess(req, departmentId);

    if (!name) throw createError('Patient name is required', 400);

    const dept = await Department.findById(departmentId);
    if (!dept) throw createError('Department not found', 404);

    // Patient + token written together, so a failed token leaves no orphan
    const { token } = await issuePatientToken({
      department: dept,
      patientData: {
        name: name.trim(),
        phone: phone || '',
        age: age || null,
        isEmergency: true, // Triggers priority=3 in Patient pre-save
      },
      priority: PRIORITY.EMERGENCY, // Explicitly set — no pre-save needed
      note: note || 'Emergency insertion by admin',
    });

    const populated = await Token.findById(token._id)
      .populate('patient', 'name age priority isEmergency')
      .populate('department', 'name code');

    // Broadcast so all clients see emergency patient jump to front
    recordInBackground({
      user: req.user,
      action: AUDIT_ACTIONS.EMERGENCY_INSERT,
      token,
      department: departmentId,
      details: `Inserted ${token.tokenNumber} for ${name.trim()}`,
    });

    broadcast('EMERGENCY_INSERT', departmentId, { data: toPublicToken(populated) });
    notifyApproachingPatientsInBackground(departmentId);

    res.status(201).json({
      success: true,
      message: `Emergency token ${token.tokenNumber} inserted at front of queue`,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/queue/all ────────────────────────────────────
// Admin — all departments summary (for dashboard overview)
const getAllQueues = async (req, res, next) => {
  try {
    // Scoped staff only see their own department in the summary
    const filter = { isActive: true };
    if (req.user?.role !== 'admin' && req.user?.department) {
      filter._id = req.user.department;
    }

    const departments = await Department.find(filter);
    const today = getISTDateString();

    const summary = await Promise.all(
      departments.map(async (dept) => {
        const waitingCount = await Token.countDocuments({
          department: dept._id,
          status: TOKEN_STATUS.WAITING,
          serviceDate: today,
        });
        const serving = await Token.findOne({
          department: dept._id,
          status: TOKEN_STATUS.SERVING,
          serviceDate: today,
        }).populate('patient', 'name');

        return {
          department: { id: dept._id, name: dept.name, code: dept.code },
          waitingCount,
          currentToken: serving?.tokenNumber || null,
          currentPatient: serving?.patient?.name || null,
        };
      })
    );

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/queue/public/:departmentId ──────────────────
// Public — display board: current serving token + next 5 waiting
const getPublicDisplay = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const today = getISTDateString();

    const serving = await Token.findOne({
      department: departmentId,
      status: TOKEN_STATUS.SERVING,
      serviceDate: today,
    }).populate('patient', 'name').populate('department', 'name code');

    const next5 = await Token.find({
      department: departmentId,
      status: TOKEN_STATUS.WAITING,
      serviceDate: today,
    })
      .populate('patient', 'name')
      .sort(queueSort())
      .limit(5);

    // Public endpoint — masked names, no age/phone/ObjectIds
    res.json({
      success: true,
      data: {
        serving: toPublicToken(serving),
        next: next5.map((token) => toPublicToken(token)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/create ───────────────────────────────
// Admin — direct token creation for demos. Only registered outside production
// (see routes/queueRoutes.js).
const DEMO_PRIORITIES = {
  emergency: PRIORITY.EMERGENCY,
  high: PRIORITY.SENIOR, // "high" is the senior-citizen tier; there is no HIGH
  normal: PRIORITY.NORMAL,
};

// The Patient pre-save hook derives priority from age/isEmergency, so the
// demo patient needs inputs that produce the priority asked for — otherwise
// the patient record and its token would disagree.
const demoPatientFor = (priorityValue, code) => ({
  name: `Demo Patient (${code})`,
  phone: '9876543210',
  ...(priorityValue === PRIORITY.EMERGENCY
    ? { isEmergency: true }
    : { age: priorityValue === PRIORITY.SENIOR ? 68 : 32 }),
});

const createQueue = async (req, res, next) => {
  try {
    const { department, priority } = req.body;

    // Omitting the department means "the first one"; naming one that does not
    // exist is an error, not a silent substitution
    const dept = department
      ? await Department.findOne({ $or: [{ name: department }, { code: department }] })
      : await Department.findOne({ isActive: true }).sort('name');

    if (!dept) {
      throw department
        ? createError(`No department matches "${department}"`, 404)
        : createError('No departments exist yet — run "npm run seed" first', 400);
    }

    assertDepartmentAccess(req, dept._id);

    const priorityValue = DEMO_PRIORITIES[priority] || PRIORITY.NORMAL;

    // Dummy patient + a real sequenced token number for this test token
    const { token } = await issuePatientToken({
      department: dept,
      patientData: demoPatientFor(priorityValue, dept.code),
      priority: priorityValue,
    });

    broadcast('QUEUE_UPDATE', dept._id);
    notifyApproachingPatientsInBackground(dept._id);

    res.status(201).json({ success: true, data: token });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQueue,
  callNext,
  skipToken,
  completeToken,
  requeueToken,
  recallToken,
  insertEmergency,
  getAllQueues,
  getPublicDisplay,
  createQueue
};

