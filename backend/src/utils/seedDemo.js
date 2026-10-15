/**
 * Demo data — around 20 waiting patients spread across departments with mixed
 * priorities, for screenshots and walkthroughs.
 *
 * Tokens are issued through the normal service, so sequence numbers, service
 * dates, public codes and queue ordering are all exactly as they would be in
 * real use. Additive: run it twice and you get two batches.
 *
 * Refuses to run when NODE_ENV=production — this is fake patient data.
 *
 * Usage: npm run seed:demo
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Department = require('../models/Department');
const { issuePatientToken } = require('../services/tokenIssueService');
const { PRIORITY } = require('../config/constants');

// age ≥ 60 becomes Senior (2) through the Patient hook; emergency becomes 3
const DEMO_PATIENTS = [
  { name: 'Arun Sharma',      age: 34, phone: '9876543210', code: 'OPD' },
  { name: 'Kamla Devi',       age: 72, phone: '9811122233', code: 'OPD' },
  { name: 'Priya Singh',      age: 25,                      code: 'OPD' },
  { name: 'Mohammed Irfan',   age: 41, phone: '9900112233', code: 'OPD' },
  { name: 'Lakshmi Narayan',  age: 67,                      code: 'OPD' },
  { name: 'Rahul Verma',      age: 29, phone: '9765432109', code: 'OPD' },

  { name: 'Suresh Nair',      age: 65, phone: '9845012345', code: 'CARD' },
  { name: 'Anita Deshpande',  age: 54,                      code: 'CARD' },
  { name: 'Harbhajan Singh',  age: 78, phone: '9888877766', code: 'CARD' },
  { name: 'Vikram Rao',       age: 47, emergency: true,     code: 'CARD' },

  { name: 'Geeta Patel',      age: 38, phone: '9723456781', code: 'ORTH' },
  { name: 'Ramesh Yadav',     age: 61,                      code: 'ORTH' },
  { name: 'Shalini Gupta',    age: 31, phone: '9654321098', code: 'ORTH' },

  { name: 'Baby Aarav Jain',  age: 3,  phone: '9812345678', code: 'PAED' },
  { name: 'Ishita Mukherjee', age: 7,                       code: 'PAED' },
  { name: 'Dhruv Chauhan',    age: 11, phone: '9700011122', code: 'PAED' },

  { name: 'Sunita Kumari',    age: 28, phone: '9633344455', code: 'GYN' },
  { name: 'Fatima Begum',     age: 33,                      code: 'GYN' },

  { name: 'Joseph Mathew',    age: 58, phone: '9596959493', code: 'NEURO' },
  { name: 'Devendra Pawar',   age: 69, emergency: true,     code: 'NEURO' },
];

const refuseInProduction = () => {
  if (process.env.NODE_ENV !== 'production') return;

  console.error('❌ Refusing to run with NODE_ENV=production.');
  console.error('   This inserts fake patients into the live queue.');
  process.exit(1);
};

const seedDemo = async () => {
  refuseInProduction();

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Connected to MongoDB (${mongoose.connection.name})`);

    const departments = await Department.find({ isActive: true });
    const byCode = new Map(departments.map((d) => [d.code, d]));

    if (byCode.size === 0) {
      throw new Error('No departments found. Run "npm run seed" first.');
    }

    const issued = [];
    const skipped = [];

    for (const person of DEMO_PATIENTS) {
      const department = byCode.get(person.code);

      if (!department) {
        skipped.push(`${person.name} (no ${person.code} department)`);
        continue;
      }

      const { token } = await issuePatientToken({
        department,
        patientData: {
          name: person.name,
          age: person.age,
          phone: person.phone || '',
          isEmergency: Boolean(person.emergency),
        },
        ...(person.emergency ? { priority: PRIORITY.EMERGENCY, note: 'Demo emergency' } : {}),
      });

      issued.push(token);
    }

    const label = { 3: 'Emergency', 2: 'Senior', 1: 'Normal' };
    const counts = issued.reduce((acc, t) => {
      acc[label[t.priority]] = (acc[label[t.priority]] || 0) + 1;
      return acc;
    }, {});

    console.log(`✅ Issued ${issued.length} waiting tokens`);
    console.log('   by priority:', Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', '));
    console.log('   by department:',
      Object.entries(
        issued.reduce((acc, t) => {
          const code = departments.find((d) => String(d._id) === String(t.department)).code;
          acc[code] = (acc[code] || 0) + 1;
          return acc;
        }, {})
      ).map(([k, v]) => `${k}:${v}`).join(' '));

    if (skipped.length > 0) console.log('⚠️  Skipped:', skipped.join(', '));

    console.log('\n🏥 Demo queue ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Demo seeding failed:', err.message);
    process.exit(1);
  }
};

seedDemo();
