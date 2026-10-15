const { MongoMemoryReplSet } = require('mongodb-memory-server');

/**
 * Starts a single-node in-memory replica set once per test run.
 *
 * A replica set (not a standalone) is deliberate: tokenIssueService uses a
 * transaction when the deployment supports one, and that path would otherwise
 * never be covered.
 */
module.exports = async () => {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  // Read by tests/setup/connect.js in each worker
  process.env.MONGO_TEST_URI = replSet.getUri();

  // Stopped again in globalTeardown
  global.__MONGO_REPLSET__ = replSet;
};
