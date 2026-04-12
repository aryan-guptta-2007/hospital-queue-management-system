const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/login  → public
router.post('/login', login);

// GET  /api/auth/me     → protected (verify token is still valid)
router.get('/me', protect, getMe);

module.exports = router;
