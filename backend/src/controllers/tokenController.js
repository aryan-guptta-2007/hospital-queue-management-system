const Patient = require('../models/Patient');
const Token = require('../models/Token');
const Department = require('../models/Department');
const { generateToken } = require('../utils/tokenGenerator');
const { getWaitTimeForToken } = require('../services/waitTimeService');
const { createError } = require('../middleware/errorHandler');
const { TOKEN_STATUS } = require('../config/constants');

// ── POST /api/tokens/generate ─────────────────────────────
// Public — patient fills form and gets a token
const generatePatientToken = async (req, res, next) => {
  try {
    const { name, phone, age, departmentId } = req.body;

    if (!name || !departmentId)
      throw createError('Name and department are required', 400);

    // Validate department exists
    const dept = await Department.findById(departmentId);
    if (!dept || !dept.isActive)
      throw createError('Selected department is not available', 404);

    // Create patient record (priority auto-set by pre-save hook)
    const patient = await Patient.create({
      name: name.trim(),
      phone: phone || '',
      age: age || null,
    });

    // Generate unique token number for today
    const { tokenNumber, sequenceNumber } = await generateToken(dept.code, dept._id);

    // Create token linked to patient + department
    const token = await Token.create({
      tokenNumber,
      sequenceNumber,
      patient: patient._id,
      department: dept._id,
      priority: patient.priority,
    });

    // Populate for response
    const populated = await Token.findById(token._id)
      .populate('patient', 'name age priority priorityLabel')
      .populate('department', 'name code avgConsultationTime');

    // Get live wait time immediately
    const { estimatedWait, position } = await getWaitTimeForToken(token._id);

    // Broadcast queue change to all WebSocket clients
    global.broadcastQueueUpdate({
      type: 'NEW_TOKEN',
      departmentId: dept._id,
      data: { tokenNumber, department: dept.name },
    });

    res.status(201).json({
      success: true,
      message: 'Token generated successfully',
      data: {
        ...populated.toObject(),
        estimatedWaitTime: estimatedWait,
        position,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tokens/:tokenNumber/status ───────────────────
// Public — patient polls this to check their position
const getTokenStatus = async (req, res, next) => {
  try {
    const token = await Token.findOne({ tokenNumber: req.params.tokenNumber })
      .populate('patient', 'name age priority')
      .populate('department', 'name code avgConsultationTime');

    if (!token) throw createError('Token not found', 404);

    let waitInfo = { estimatedWait: 0, position: null };

    if (token.status === TOKEN_STATUS.WAITING) {
      waitInfo = await getWaitTimeForToken(token._id);
    }

    res.json({
      success: true,
      data: {
        ...token.toObject(),
        estimatedWaitTime: waitInfo.estimatedWait,
        position: waitInfo.position,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tokens/current/:departmentId ─────────────────
// Public — which token is currently being served
const getCurrentToken = async (req, res, next) => {
  try {
    const token = await Token.findOne({
      department: req.params.departmentId,
      status: TOKEN_STATUS.SERVING,
    }).populate('patient', 'name');

    res.json({ success: true, data: token || null });
  } catch (err) {
    next(err);
  }
};

module.exports = { generatePatientToken, getTokenStatus, getCurrentToken };
