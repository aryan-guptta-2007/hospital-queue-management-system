// Global error handler — catches anything thrown in controllers
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error(`[ERROR] ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Show stack trace only in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Helper to create structured errors cleanly from controllers
const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };
