const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('./errorHandler');

const protect = async (req, res, next) => {
  // Expect: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('Not authorized. No token provided.', 401));
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(createError('Not authorized. Token is invalid or expired.', 401));
  }

  try {
    // Load the live user so deleted/disabled accounts lose access immediately,
    // even while they still hold a valid (unexpired) token.
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(createError('Not authorized. User no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(createError('Account is disabled. Contact administrator.', 403));
    }

    req.user = user; // Mongoose doc — req.user.id / .role / .department
    next();
  } catch (err) {
    next(err);
  }
};

// ── requireRole('admin', 'staff') — must run after protect ──
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(createError('Not authorized. No token provided.', 401));
  }

  if (!roles.includes(req.user.role)) {
    return next(createError('Forbidden. Insufficient permissions.', 403));
  }

  next();
};

module.exports = { protect, requireRole };
