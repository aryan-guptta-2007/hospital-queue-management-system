const express = require('express');
const router = express.Router();
const { login, getMe, register } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// POST /api/auth/register → public
router.post("/register", register);


// POST /api/auth/login  → public
router.post('/login', login);

// GET  /api/auth/me     → protected (verify token is still valid)
router.get('/me', protect, getMe);

module.exports = router;
