const request = require('supertest');
const app = require('../../src/app');
const Department = require('../../src/models/Department');
const User = require('../../src/models/User');
const { issuePatientToken } = require('../../src/services/tokenIssueService');

const PASSWORD = 'secret123';

/** Two departments is enough to prove scoping and isolation */
const seedDepartments = async () => {
  const [opd, card] = await Department.create([
    { name: 'Out Patient Department', code: 'OPD', avgConsultationTime: 10 },
    { name: 'Cardiology', code: 'CARD', avgConsultationTime: 15 },
  ]);

  return { opd, card };
};

const createUser = ({ role = 'staff', email, department = null, name = 'Test User' }) =>
  User.create({ name, email, password: PASSWORD, role, department });

const login = async (email, password = PASSWORD) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });

  return res.body.token;
};

/** An admin, a staff member tied to OPD, and a staff member tied to nothing */
const seedUsers = async (opdId) => {
  await createUser({ role: 'admin', email: 'admin@hospital.test', name: 'Hospital Admin' });
  await createUser({
    role: 'staff',
    email: 'opd@hospital.test',
    name: 'OPD Staff',
    department: opdId,
  });
  await createUser({ role: 'staff', email: 'float@hospital.test', name: 'Floating Staff' });

  return {
    adminJwt: await login('admin@hospital.test'),
    opdStaffJwt: await login('opd@hospital.test'),
    floatStaffJwt: await login('float@hospital.test'),
  };
};

/** Issues a token straight through the service, bypassing HTTP */
const issueToken = async (
  department,
  { name = 'Test Patient', age = 30, phone = '', emergency = false } = {}
) => {
  const { token } = await issuePatientToken({
    department,
    patientData: { name, age, phone, isEmergency: emergency },
    ...(emergency ? { priority: 3 } : {}),
  });

  return token;
};

/** Issues a token the way a patient does, over HTTP */
const generateToken = (departmentId, body = {}) =>
  request(app)
    .post('/api/tokens/generate')
    .send({ name: 'Walk In Patient', age: 30, departmentId, ...body });

const auth = (jwt) => ({ Authorization: `Bearer ${jwt}` });

module.exports = {
  PASSWORD,
  app,
  seedDepartments,
  seedUsers,
  createUser,
  login,
  issueToken,
  generateToken,
  auth,
};
