const Token = require('../models/Token');
const Department = require('../models/Department');
const { issuePatientToken } = require('../services/tokenIssueService');
const { getWaitTimeForToken } = require('../services/waitTimeService');
const { createError } = require('../middleware/errorHandler');
const { TOKEN_STATUS } = require('../config/constants');
const { toPublicToken } = require('../utils/publicView');
const { broadcast } = require('../realtime/socket');
const { notifyApproachingPatientsInBackground } = require('../services/notifier');

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

    // Patient + token are written together — a failed token never leaves
    // an orphan patient record behind (priority auto-set by pre-save hook)
    const { token } = await issuePatientToken({
      department: dept,
      patientData: {
        name: name.trim(),
        phone: phone || '',
        age: age || null,
      },
    });

    // Populate for response
    const populated = await Token.findById(token._id)
      .populate('patient', 'name age priority priorityLabel')
      .populate('department', 'name code avgConsultationTime');

    // Get live wait time immediately
    const { estimatedWait, estimatedWaitRange, position } = await getWaitTimeForToken(token._id);

    // Broadcast queue change to all WebSocket clients
    // Deliberately no publicCode here — this reaches every subscriber
    broadcast(dept._id, {
      type: 'NEW_TOKEN',
      data: { tokenNumber: token.tokenNumber, department: dept.name },
    });

    // Someone registering into a short queue is already near the front, and
    // may well have registered from the QR link rather than the waiting room
    notifyApproachingPatientsInBackground(dept._id);

    res.status(201).json({
      success: true,
      message: 'Token generated successfully',
      data: {
        ...populated.toObject(),
        estimatedWaitTime: estimatedWait,
        estimatedWaitRange,
        position,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tokens/status/:publicCode ────────────────────
// Public — patient polls this to check their position
const getTokenStatusByCode = async (req, res, next) => {
  try {
    const publicCode = String(req.params.publicCode || '').toUpperCase();

    const token = await Token.findOne({ publicCode })
      .populate('patient', 'name age priority')
      .populate('department', 'name code avgConsultationTime');

    if (!token) throw createError('Token not found', 404);

    let waitInfo = { estimatedWait: 0, estimatedWaitRange: null, position: null };

    if (token.status === TOKEN_STATUS.WAITING) {
      waitInfo = await getWaitTimeForToken(token._id);
    }

    // Public endpoint — masked name, no age/phone/ObjectIds
    res.json({
      success: true,
      data: toPublicToken(token, {
        position: waitInfo.position,
        estimatedWaitTime: waitInfo.estimatedWait,
        estimatedWaitRange: waitInfo.estimatedWaitRange,
      }),
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

    // Public endpoint — masked name, no age/phone/ObjectIds
    res.json({ success: true, data: toPublicToken(token) });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tokens/:tokenNumber/status  (retired) ────────
// Token numbers are guessable ("OPD-001"), so they can no longer be used to
// read a patient's record. Kept so old links get a clear answer.
const getTokenStatusGone = (req, res, next) => {
  next(
    createError(
      'This endpoint has been retired. Use GET /api/tokens/status/:publicCode with the code printed on your token.',
      410
    )
  );
};

module.exports = {
  generatePatientToken,
  getTokenStatusByCode,
  getTokenStatusGone,
  getCurrentToken,
};
