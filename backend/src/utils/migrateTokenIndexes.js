/**
 * One-off migration — run once after deploying the daily-sequence fix:
 *   npm run migrate:indexes
 *
 * Mongoose never drops an index that has left the schema, so the old unique
 * index on tokenNumber survives in MongoDB and would still reject day 2's
 * "OPD-001". This drops it and builds the new indexes.
 *
 * It also backfills queuedAt (the key every queue sort now orders on) from
 * createdAt, and refuses to build the one-serving-per-department index if the
 * data already breaks that rule. Safe to run more than once.
 *
 * Existing tokens keep no serviceDate, so the partial unique index skips them,
 * and no publicCode, so they can only be looked up from the staff screens.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Token = require('../models/Token');

// Replaced by department_1_serviceDate_1_sequenceNumber_1 and the queuedAt
// ordering index respectively
const STALE_INDEXES = ['tokenNumber_1', 'department_1_status_1_priority_-1_createdAt_1'];

/** Index list, tolerating a database where no token has been written yet */
const listIndexes = async () => {
  try {
    return await Token.collection.indexes();
  } catch (err) {
    if (err?.code === 26 || /ns does not exist/i.test(err.message || '')) return [];
    throw err;
  }
};

/** Tokens predate queuedAt, which every queue sort now orders on */
const backfillQueuedAt = async () => {
  const result = await Token.updateMany({ queuedAt: { $exists: false } }, [
    { $set: { queuedAt: '$createdAt' } },
  ]);

  console.log(
    result.modifiedCount > 0
      ? `✅ Backfilled queuedAt on ${result.modifiedCount} token(s) from createdAt`
      : 'ℹ️  No tokens needed a queuedAt backfill'
  );
};

/**
 * The new partial unique index allows one serving token per department, so a
 * database that already breaks that rule cannot build it. Report it plainly
 * instead of letting the index build fail.
 */
const assertOneServingPerDepartment = async () => {
  const offenders = await Token.aggregate([
    { $match: { status: 'serving' } },
    { $group: { _id: '$department', count: { $sum: 1 }, tokens: { $push: '$tokenNumber' } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (offenders.length === 0) {
    console.log('ℹ️  One serving token per department — index can be built');
    return;
  }

  offenders.forEach((o) => console.error(`   department ${o._id}: ${o.tokens.join(', ')}`));
  throw new Error(
    `${offenders.length} department(s) have more than one serving token. ` +
      'Complete or skip the extras, then run this again.'
  );
};

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await listIndexes();
    console.log('ℹ️  Indexes before:', existing.map((i) => i.name).join(', ') || '(no tokens collection yet)');

    for (const name of STALE_INDEXES) {
      if (existing.some((i) => i.name === name)) {
        await Token.collection.dropIndex(name);
        console.log(`✅ Dropped stale index ${name}`);
      } else {
        console.log(`ℹ️  Index ${name} already gone`);
      }
    }

    await backfillQueuedAt();
    await assertOneServingPerDepartment();

    await Token.syncIndexes();
    const after = await listIndexes();
    console.log('✅ Indexes after:', after.map((i) => i.name).join(', '));

    console.log('\n🏥 Token indexes migrated.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();
