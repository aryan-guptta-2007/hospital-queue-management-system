const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');

const protect = (req, res, next) => {
  // Expect: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('Not authorized. No token provided.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user payload to request
    next();
  } catch (err) {
    return next(createError('Not authorized. Token is invalid or expired.', 401));
  }
};

module.exports = { protect };
