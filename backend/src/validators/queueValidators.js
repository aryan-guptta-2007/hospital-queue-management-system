const { z } = require('zod');
const { objectId, personName, indianMobile, age } = require('./common');

const departmentParams = z.object({ departmentId: objectId });
const tokenParams = z.object({ tokenId: objectId });

// GET  /api/queue/:departmentId
// GET  /api/queue/public/:departmentId
const byDepartment = { params: departmentParams };

// POST /api/queue/:departmentId/next
const callNext = {
  params: departmentParams,
  body: z.object({
    // The serving token the staff screen is showing, or null for "none"
    currentServingId: objectId.nullish(),
  }),
};

// POST /api/queue/:departmentId/emergency
const insertEmergency = {
  params: departmentParams,
  body: z.object({
    name: personName,
    phone: indianMobile,
    age,
    note: z.string().trim().max(200, 'Note must be at most 200 characters').optional(),
  }),
};

// POST /api/queue/:departmentId/recall
const recall = { params: departmentParams };

// POST /api/queue/token/:tokenId/{skip,complete,requeue}
const tokenAction = { params: tokenParams };

// POST /api/queue/create — demo helper on the dashboard
const createDemoToken = {
  body: z.object({
    department: z.string().trim().min(2).max(80).optional(),
    priority: z.enum(['normal', 'high', 'emergency']).optional(),
  }),
};

module.exports = { byDepartment, callNext, insertEmergency, recall, tokenAction, createDemoToken };
