/**
 * Seed Script — Run once to populate:
 *   - Default departments
 *   - One admin user (email: admin@hospital.com / password: admin123)
 *
 * Usage: node src/utils/seeder.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Department = require('../models/Department');
const User = require('../models/User');
const Token = require('../models/Token');
const Patient = require('../models/Patient');

const departments = [
  { name: 'Out Patient Department', code: 'OPD',  avgConsultationTime: 10 },
  { name: 'Cardiology',             code: 'CARD', avgConsultationTime: 15 },
  { name: 'Orthopaedics',           code: 'ORTH', avgConsultationTime: 12 },
  { name: 'Paediatrics',            code: 'PAED', avgConsultationTime: 10 },
  { name: 'Gynaecology',            code: 'GYN',  avgConsultationTime: 12 },
  { name: 'Neurology',              code: 'NEURO',avgConsultationTime: 20 },
  { name: 'Emergency',              code: 'EMRG', avgConsultationTime: 5  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('✅ Connected to MongoDB');

    // ── Clear all collections ─────────────────────────────
    await Token.deleteMany({});
    await Patient.deleteMany({});
    await Department.deleteMany({});
    await User.deleteMany({});
    console.log('✅ Cleared all collections');
    const createdDepts = await Department.insertMany(departments);
    console.log(`✅ Inserted ${createdDepts.length} departments`);

    // ── Admin User ────────────────────────────────────────
    await User.deleteMany({});
    await User.create({
      name: 'Hospital Admin',
      email: 'admin@hospital.com',
      password: 'admin123',   // Will be hashed by pre-save hook
      role: 'admin',
    });
    console.log('✅ Admin user created → admin@hospital.com / admin123');

    console.log('\n🏥 Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seedDB();
