const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  generatePatientToken,
  getTokenStatusByCode,
  getTokenStatusGone,
  getCurrentToken,
} = require('../controllers/tokenController');
const { validate } = require('../validators/validate');
const schemas = require('../validators/tokenValidators');

// Stops one device flooding a department with tokens. A hospital behind a
// single public IP or a shared kiosk will need these raised — see .env.example.
const WINDOW_MINUTES = Number(process.env.TOKEN_RATE_LIMIT_WINDOW_MIN) || 10;
const MAX_TOKENS = Number(process.env.TOKEN_RATE_LIMIT_MAX) || 5;

const generateLimiter = rateLimit({
  windowMs: WINDOW_MINUTES * 60 * 1000,
  limit: MAX_TOKENS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: `Too many tokens requested from this device. Please try again in ${WINDOW_MINUTES} minutes, or ask at the help desk.`,
  },
});

// POST /api/tokens/generate              → public (patient generates token)
router.post('/generate', generateLimiter, validate(schemas.generate), generatePatientToken);

// GET  /api/tokens/status/:publicCode    → public (patient checks their token)
router.get('/status/:publicCode', validate(schemas.statusByCode), getTokenStatusByCode);

// GET  /api/tokens/:tokenNumber/status   → retired, answers 410 Gone
router.get('/:tokenNumber/status', getTokenStatusGone);

// GET  /api/tokens/current/:departmentId → public (what token is being served)
router.get('/current/:departmentId', validate(schemas.currentByDepartment), getCurrentToken);

module.exports = router;
