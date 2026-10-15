/**
 * DESTRUCTIVE reset — deletes every token, patient, counter, department and
 * user, then seeds the departments and first admin again.
 *
 * Refuses to run when NODE_ENV=production.
 *
 * Usage: npm run seed:reset
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Token = require('../models/Token');
const Patient = require('../models/Patient');
const Counter = require('../models/Counter');
const Department = require('../models/Department');
const User = require('../models/User');
const { upsertDepartments, ensureAdmin } = require('./seeder');

const refuseInProduction = () => {
  if (process.env.NODE_ENV !== 'production') return;

  console.error('❌ Refusing to run with NODE_ENV=production.');
  console.error('   This deletes every token, patient, department and user.');
  console.error('   If you really mean it, run it with NODE_ENV unset against that database.');
  process.exit(1);
};

const reset = async () => {
  refuseInProduction();

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Connected to MongoDB (${mongoose.connection.name})`);

    const removed = {
      tokens: (await Token.deleteMany({})).deletedCount,
      patients: (await Patient.deleteMany({})).deletedCount,
      counters: (await Counter.deleteMany({})).deletedCount,
      departments: (await Department.deleteMany({})).deletedCount,
      users: (await User.deleteMany({})).deletedCount,
    };

    console.log('🗑️  Deleted:', Object.entries(removed).map(([k, v]) => `${v} ${k}`).join(', '));

    await upsertDepartments();
    await ensureAdmin();

    console.log('\n🏥 Database reset and reseeded.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
  }
};

reset();
