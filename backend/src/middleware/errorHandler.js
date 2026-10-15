// Global error handler — catches anything thrown in controllers
//
// Database-level failures are translated into the status code a client should
// actually see, instead of a blanket 500.
const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  let statusCode = err.statusCode;
  let message = err.message || 'Internal Server Error';
  let details;

  // Only classify errors that did not already set their own status
  if (!statusCode) {
    if (err.name === 'ValidationError' && err.errors) {
      // Mongoose schema validation (required, min, enum, match, ...)
      statusCode = 400;
      details = Object.values(err.errors).map((e) => e.message);
      message = details.join('; ') || 'Validation failed';
    } else if (err.name === 'CastError') {
      // A malformed id or wrong type reached the database
      statusCode = 400;
      message = `Invalid value for "${err.path}"`;
    } else if (err.code === 11000) {
      // Unique index violation
      statusCode = 409;
      const fields = Object.keys(err.keyPattern || err.keyValue || {}).join(', ');
      message = fields ? `A record with that ${fields} already exists` : 'Duplicate record';
    } else if (err.name === 'ZodError') {
      statusCode = 400;
      message = 'Invalid request data';
    } else {
      statusCode = 500;
    }
  }

  // Internal failures must not describe themselves to the outside world
  if (statusCode >= 500 && isProduction) {
    message = 'Internal Server Error';
  }

  console.error(`[ERROR] ${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    // Stack traces are a development aid — never sent in production
    ...(!isProduction && { stack: err.stack }),
  });
};

// Helper to create structured errors cleanly from controllers
const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };
