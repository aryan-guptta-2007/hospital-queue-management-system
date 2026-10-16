const validateEnv = () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ FATAL: MONGO_URI environment variable is missing');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is missing');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET must be at least 32 characters long in production');
    process.exit(1);
  }
};

module.exports = { validateEnv };
