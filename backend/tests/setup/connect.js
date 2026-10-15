const mongoose = require('mongoose');

// Registering every model up front so syncIndexes covers all of them
require('../../src/models/Token');
require('../../src/models/Patient');
require('../../src/models/Department');
require('../../src/models/User');
require('../../src/models/Counter');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI, { dbName: 'hospital_queue_test' });

  // Several guarantees in this system are enforced by indexes rather than by
  // code — one serving token per department, one sequence number per
  // department per service date, unique public codes. Without building them,
  // the tests that rely on them would pass for the wrong reason.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).syncIndexes()));
});

afterEach(async () => {
  const { collections } = mongoose.connection;

  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
