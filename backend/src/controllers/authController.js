const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../middleware/errorHandler');

// ── Sign JWT ───────────────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

// ── POST /api/auth/login ───────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      throw createError('Email and password are required', 400);

    // select:false on password — must explicitly include it
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password)))
      throw createError('Invalid email or password', 401);

    if (!user.isActive)
      throw createError('Account is disabled. Contact administrator.', 403);

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ───────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('department', 'name code');
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe };
