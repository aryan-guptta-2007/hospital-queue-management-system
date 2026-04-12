const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// POST /api/auth/register → public
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = new User({ name, email, password });
    await user.save();

    res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login  → public
router.post('/login', login);

// GET  /api/auth/me     → protected (verify token is still valid)
router.get('/me', protect, getMe);

module.exports = router;
