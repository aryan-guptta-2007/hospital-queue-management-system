const Token = require('../models/Token');
const Patient = require('../models/Patient');
const Department = require('../models/Department');
const { getWaitingQueue, calculateWaitTimes } = require('../services/queueService');
const { generateToken } = require('../utils/tokenGenerator');
const { createError } = require('../middleware/errorHandler');
const { TOKEN_STATUS, PRIORITY } = require('../config/constants');

// ── Helper: broadcast after any queue change ───────────────
const broadcast = (type, departmentId, extra = {}) => {
  global.broadcastQueueUpdate({ type, departmentId, ...extra });
};

// ── GET /api/queue/:departmentId ──────────────────────────
// Admin — full sorted queue with wait times
const getQueue = async (req, res, next) => {
  try {
    const queue = await getWaitingQueue(req.params.departmentId);
    const queueWithWaitTimes = await calculateWaitTimes(queue, req.params.departmentId);

    // Also return the currently-serving token
    const serving = await Token.findOne({
      department: req.params.departmentId,
      status: TOKEN_STATUS.SERVING,
    }).populate('patient', 'name age priority');

    res.json({
      success: true,
      data: {
        serving: serving || null,
        waiting: queueWithWaitTimes,
        waitingCount: queueWithWaitTimes.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/:departmentId/next ────────────────────
// Admin — call the next patient (highest priority, earliest arrival)
const callNext = async (req, res, next) => {
  try {
    const { departmentId } = req.params;

    // Mark current 'serving' token as completed before calling next
    await Token.findOneAndUpdate(
      { department: departmentId, status: TOKEN_STATUS.SERVING },
      { status: TOKEN_STATUS.COMPLETED, completedAt: new Date() }
    );

    // Get highest priority waiting token
    const nextToken = await Token.findOneAndUpdate(
      { department: departmentId, status: TOKEN_STATUS.WAITING },
      { status: TOKEN_STATUS.SERVING, calledAt: new Date() },
      { new: true, sort: { priority: -1, createdAt: 1 } }
    ).populate('patient', 'name age priority isEmergency')
     .populate('department', 'name code');

    if (!nextToken) {
      return res.json({ success: true, message: 'Queue is empty', data: null });
    }

    broadcast('NEXT_TOKEN', departmentId, { data: nextToken });

    res.json({ success: true, message: 'Next patient called', data: nextToken });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/token/:tokenId/skip ───────────────────
// Admin — skip a patient (they move to end of same-priority group)
const skipToken = async (req, res, next) => {
  try {
    const token = await Token.findByIdAndUpdate(
      req.params.tokenId,
      {
        status: TOKEN_STATUS.SKIPPED,
        skippedAt: new Date(),
      },
      { new: true }
    ).populate('patient', 'name');

    if (!token) throw createError('Token not found', 404);

    broadcast('TOKEN_SKIPPED', token.department, { tokenId: token._id });

    res.json({ success: true, message: `Token ${token.tokenNumber} skipped`, data: token });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/token/:tokenId/complete ───────────────
// Admin — manually mark consultation as done
const completeToken = async (req, res, next) => {
  try {
    const token = await Token.findByIdAndUpdate(
      req.params.tokenId,
      { status: TOKEN_STATUS.COMPLETED, completedAt: new Date() },
      { new: true }
    ).populate('patient', 'name');

    if (!token) throw createError('Token not found', 404);

    broadcast('TOKEN_COMPLETED', token.department, { tokenId: token._id });

    res.json({ success: true, message: `Token ${token.tokenNumber} completed`, data: token });
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

    if (!name) throw createError('Patient name is required', 400);

    const dept = await Department.findById(departmentId);
    if (!dept) throw createError('Department not found', 404);

    // Create patient with emergency flag (priority=3 set by pre-save hook)
    const patient = await Patient.create({
      name: name.trim(),
      phone: phone || '',
      age: age || null,
      isEmergency: true,  // Triggers priority=3 in Patient pre-save
    });

    const { tokenNumber, sequenceNumber } = await generateToken(dept.code, dept._id);

    const token = await Token.create({
      tokenNumber,
      sequenceNumber,
      patient: patient._id,
      department: dept._id,
      priority: PRIORITY.EMERGENCY, // Explicitly set — no pre-save needed
      note: note || 'Emergency insertion by admin',
    });

    const populated = await Token.findById(token._id)
      .populate('patient', 'name age priority isEmergency')
      .populate('department', 'name code');

    // Broadcast so all clients see emergency patient jump to front
    broadcast('EMERGENCY_INSERT', departmentId, { data: populated });

    res.status(201).json({
      success: true,
      message: `Emergency token ${tokenNumber} inserted at front of queue`,
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
    const departments = await Department.find({ isActive: true });

    const summary = await Promise.all(
      departments.map(async (dept) => {
        const waitingCount = await Token.countDocuments({
          department: dept._id,
          status: TOKEN_STATUS.WAITING,
        });
        const serving = await Token.findOne({
          department: dept._id,
          status: TOKEN_STATUS.SERVING,
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

    const serving = await Token.findOne({
      department: departmentId,
      status: TOKEN_STATUS.SERVING,
    }).populate('patient', 'name').populate('department', 'name code');

    const next5 = await Token.find({
      department: departmentId,
      status: TOKEN_STATUS.WAITING,
    })
      .populate('patient', 'name')
      .sort({ priority: -1, createdAt: 1 })
      .limit(5);

    res.json({ success: true, data: { serving: serving || null, next: next5 } });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/queue/create ───────────────────────────────
// Admin — (Direct token creation for testing)
const createQueue = async (req, res, next) => {
  try {
    const { tokenNumber, department, priority } = req.body;

    let dept = await Department.findOne({
      $or: [{ name: department }, { code: department }]
    });

    if (!dept) {
      // Fallback to first department if search fails
      dept = await Department.findOne();
      if (!dept) throw createError('Please run seed script first', 400);
    }

    // Use priority map
    const priorityValue = priority === 'emergency' ? PRIORITY.EMERGENCY :
                         priority === 'high' ? PRIORITY.HIGH :
                         PRIORITY.NORMAL;

    // Create a dummy patient for this test token
    const patient = await Patient.create({
      name: `Demo Patient for ${tokenNumber}`,
      phone: '000-000-0000',
      priority: priorityValue
    });

    const token = await Token.create({
      tokenNumber: tokenNumber || `DEMO-${Math.floor(Math.random() * 100)}`,
      sequenceNumber: 1, // simplified for demo
      patient: patient._id,
      department: dept._id,
      priority: priorityValue,
      status: TOKEN_STATUS.WAITING
    });

    broadcast('QUEUE_UPDATE', dept._id);

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
  insertEmergency,
  getAllQueues,
  getPublicDisplay,
  createQueue
};

