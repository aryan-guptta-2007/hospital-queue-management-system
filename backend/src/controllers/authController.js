const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../middleware/errorHandler');

// Mirrors the enum on the User model
const ALLOWED_ROLES = ['admin', 'staff'];

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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
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

// ── POST /api/auth/register  (admin only) ──────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createError('User already exists', 400);
    }

    // Only an admin reaches this route, so an explicit role is honoured —
    // but it must be a real role, and everyone else defaults to 'staff'.
    if (role && !ALLOWED_ROLES.includes(role)) {
      throw createError(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400);
    }

    const user = await User.create({
      name,
      email,
      password,
      role: req.user?.role === 'admin' && role ? role : 'staff',
    });

    res.json({
      success: true,
      message: 'User registered successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/auth/change-password ────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      throw createError('Current and new password are required', 400);

    if (newPassword.length < 6)
      throw createError('New password must be at least 6 characters', 400);

    if (newPassword === currentPassword)
      throw createError('New password must be different from the current one', 400);

    // select:false on password — must explicitly include it
    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw createError('User not found', 404);

    if (!(await user.comparePassword(currentPassword)))
      throw createError('Current password is incorrect', 401);

    user.password = newPassword;        // Hashed by the pre-save hook
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, register, changePassword };

