/**
 * Runs before any application module is imported, so route modules that read
 * configuration at load time (the rate limiters) see these values.
 *
 * The rate limits are raised here rather than lowered in the application, so
 * production defaults stay exactly as shipped.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-not-used-anywhere-real';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.AVG_CONSULTATION_TIME = '10';
process.env.TOKEN_RATE_LIMIT_MAX = '100000';
process.env.LOGIN_RATE_LIMIT_MAX = '100000';
