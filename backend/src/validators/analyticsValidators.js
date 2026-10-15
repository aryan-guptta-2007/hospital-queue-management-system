const { z } = require('zod');
const { objectId } = require('./common');

/** An IST calendar date, the same shape Token.serviceDate is stored in */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must look like YYYY-MM-DD');

// Shared by every analytics endpoint; all three are optional and the service
// falls back to the last seven days
const rangeQuery = {
  query: z.object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    departmentId: objectId.optional(),
  }),
};

module.exports = { rangeQuery };
