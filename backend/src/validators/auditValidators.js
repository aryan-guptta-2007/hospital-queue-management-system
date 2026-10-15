const { z } = require('zod');
const { objectId } = require('./common');
const { AUDIT_ACTIONS } = require('../models/AuditLog');

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must look like YYYY-MM-DD');

// GET /api/audit
const listQuery = {
  query: z.object({
    action: z.enum(Object.values(AUDIT_ACTIONS)).optional(),
    userId: objectId.optional(),
    departmentId: objectId.optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  }),
};

module.exports = { listQuery };
