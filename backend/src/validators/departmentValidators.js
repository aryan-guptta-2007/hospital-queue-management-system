const { z } = require('zod');
const { objectId } = require('./common');

const departmentBody = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Department name must be at least 2 characters')
    .max(80, 'Department name must be at most 80 characters'),
  // Used as the token prefix, e.g. "OPD-001"
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,10}$/, 'Code must be 2–10 letters'),
  avgConsultationTime: z.coerce
    .number()
    .int('Consultation time must be a whole number of minutes')
    .min(1, 'Consultation time must be at least 1 minute')
    .max(120, 'Consultation time must be at most 120 minutes')
    .optional(),
  activeCounters: z.coerce
    .number()
    .int('Active counters must be a whole number')
    .min(1, 'A department needs at least one counter')
    .max(20, 'At most 20 counters')
    .optional(),
  isActive: z.boolean().optional(),
});

// GET   /api/departments/:id
const byId = { params: z.object({ id: objectId }) };

// POST  /api/departments
const create = { body: departmentBody };

// PATCH /api/departments/:id — any subset of the same fields
const update = {
  params: z.object({ id: objectId }),
  body: departmentBody.partial(),
};

module.exports = { byId, create, update };
