module.exports = {
  testEnvironment: 'node',
  // One in-memory replica set for the whole run (replica set, so the
  // Patient+Token transaction in tokenIssueService is actually exercised)
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
  // Environment must be in place before any src module is imported
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/connect.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // Suites share one database, so they run one at a time
  maxWorkers: 1,
  testTimeout: 30000,
  clearMocks: true,
};
