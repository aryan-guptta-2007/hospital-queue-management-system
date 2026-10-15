const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, getMe, register, changePassword } = require('../controllers/authController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { validate } = require('../validators/validate');
const schemas = require('../validators/authValidators');

// Throttle credential stuffing — 10 attempts per IP per 15 minutes.
// Overridable so tests can raise it without weakening the shipped default.
const LOGIN_WINDOW_MINUTES = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MIN) || 15;
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10;

const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MINUTES * 60 * 1000,
  limit: LOGIN_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: `Too many login attempts. Please try again in ${LOGIN_WINDOW_MINUTES} minutes.`,
  },
});

// POST /api/auth/register → admin only (staff accounts are created by admins)
router.post('/register', protect, requireRole('admin'), validate(schemas.register), register);

// POST /api/auth/login  → public (rate limited)
router.post('/login', loginLimiter, validate(schemas.login), login);

// GET  /api/auth/me     → protected (verify token is still valid)
router.get('/me', protect, getMe);

// PATCH /api/auth/change-password → protected (any logged-in user)
router.patch('/change-password', protect, validate(schemas.changePassword), changePassword);

module.exports = router;
