const { z } = require('zod');
const { objectId, personName, indianMobile, age } = require('./common');

// 8 characters from the publicCode alphabet, in either case — the controller
// uppercases before looking it up
const publicCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{8}$/, 'Tracking code must be 8 letters or digits');

// POST /api/tokens/generate
const generate = {
  body: z.object({
    name: personName,
    phone: indianMobile,
    age,
    departmentId: objectId,
  }),
};

// GET /api/tokens/status/:publicCode
const statusByCode = {
  params: z.object({ publicCode }),
};

// GET /api/tokens/current/:departmentId
const currentByDepartment = {
  params: z.object({ departmentId: objectId }),
};

module.exports = { generate, statusByCode, currentByDepartment };
