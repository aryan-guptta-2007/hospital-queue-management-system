/**
 * Seed Script — safe to run as often as you like.
 *
 *   - Departments are upserted by code. Existing ones are left exactly as they
 *     are, because avgConsultationTime and isActive are tunable from the admin
 *     screens and a re-seed must not quietly revert that.
 *   - The admin is created only when the database has no admin at all, so
 *     re-running never resets a password somebody has already changed.
 *
 * The first admin's password comes from SEED_ADMIN_PASSWORD. There is no
 * default — a shipped default password is a shipped vulnerability.
 *
 * Usage: npm run seed
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Department = require('../models/Department');
const User = require('../models/User');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@hospital.com';

const DEPARTMENTS = [
  { name: 'Out Patient Department', code: 'OPD',  avgConsultationTime: 10 },
  { name: 'Cardiology',             code: 'CARD', avgConsultationTime: 15 },
  { name: 'Orthopaedics',           code: 'ORTH', avgConsultationTime: 12 },
  { name: 'Paediatrics',            code: 'PAED', avgConsultationTime: 10 },
  { name: 'Gynaecology',            code: 'GYN',  avgConsultationTime: 12 },
  { name: 'Neurology',              code: 'NEURO',avgConsultationTime: 20 },
  { name: 'Emergency',              code: 'EMRG', avgConsultationTime: 5  },
];

/** Creates any missing department; never touches one that already exists */
const upsertDepartments = async () => {
  let created = 0;

  for (const department of DEPARTMENTS) {
    const result = await Department.updateOne(
      { code: department.code },
      { $setOnInsert: { ...department, isActive: true } },
      { upsert: true }
    );

    if (result.upsertedCount > 0) created += 1;
  }

  console.log(
    created > 0
      ? `✅ Created ${created} department(s); ${DEPARTMENTS.length - created} already present`
      : `ℹ️  All ${DEPARTMENTS.length} departments already present`
  );
};

/** Creates the first admin, or leaves an existing one completely alone */
const ensureAdmin = async () => {
  const existing = await User.findOne({ role: 'admin' }).select('email');

  if (existing) {
    console.log(`ℹ️  Admin already exists (${existing.email}) — left untouched`);
    return;
  }

  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      'SEED_ADMIN_PASSWORD is not set. Pick a password and put it in backend/.env ' +
        'before seeding the first admin.'
    );
  }

  if (password.length < 6) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 6 characters.');
  }

  await User.create({
    name: 'Hospital Admin',
    email: ADMIN_EMAIL,
    password, // Hashed by the pre-save hook
    role: 'admin',
    mustChangePassword: true, // Must be rotated at first sign-in
  });

  console.log(`✅ Admin created → ${ADMIN_EMAIL} (must change password at first sign-in)`);
};

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await upsertDepartments();
    await ensureAdmin();

    console.log('\n🏥 Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

if (require.main === module) seedDB();

module.exports = { DEPARTMENTS, upsertDepartments, ensureAdmin };
