const express = require('express');
const router = express.Router();
const {
  getQueue,
  callNext,
  skipToken,
  completeToken,
  requeueToken,
  recallToken,
  insertEmergency,
  getAllQueues,
  getPublicDisplay,
  getPublicSummary,
  createQueue,
} = require('../controllers/queueController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../validators/validate');
const schemas = require('../validators/queueValidators');

// GET /api/queue/public-summary       → public queue overview for all departments (landing preview)
router.get('/public-summary', getPublicSummary);

// GET /api/queue/public/:departmentId → public display board (no auth)
router.get('/public/:departmentId', validate(schemas.byDepartment), getPublicDisplay);

// All queue management is admin-only → apply protect to all routes
router.use(protect);

// GET  /api/queue/all                      → all depts summary (dashboard)
router.get('/all', getAllQueues);

// POST /api/queue/create                   → demo token, never in production
if (process.env.NODE_ENV !== 'production') {
  router.post('/create', validate(schemas.createDemoToken), createQueue);
}


// GET  /api/queue/:departmentId            → full sorted queue for one dept
router.get('/:departmentId', validate(schemas.byDepartment), getQueue);

// POST /api/queue/:departmentId/next       → call next patient
router.post('/:departmentId/next', validate(schemas.callNext), callNext);

// POST /api/queue/:departmentId/emergency  → insert emergency patient
router.post('/:departmentId/emergency', validate(schemas.insertEmergency), insertEmergency);

// POST /api/queue/:departmentId/recall     → re-announce the serving token
router.post('/:departmentId/recall', validate(schemas.recall), recallToken);

// POST /api/queue/token/:tokenId/skip      → skip a patient
router.post('/token/:tokenId/skip', validate(schemas.tokenAction), skipToken);

// POST /api/queue/token/:tokenId/complete  → mark completed
router.post('/token/:tokenId/complete', validate(schemas.tokenAction), completeToken);

// POST /api/queue/token/:tokenId/requeue   → skipped patient back into queue
router.post('/token/:tokenId/requeue', validate(schemas.tokenAction), requeueToken);

module.exports = router;
