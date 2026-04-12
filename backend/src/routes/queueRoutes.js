const express = require('express');
const router = express.Router();
const {
  getQueue,
  callNext,
  skipToken,
  completeToken,
  insertEmergency,
  getAllQueues,
  getPublicDisplay,
} = require('../controllers/queueController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/queue/public/:departmentId → public display board (no auth)
router.get('/public/:departmentId', getPublicDisplay);

// GET  /api/queue/all                      → all depts summary (dashboard)
router.get('/all', getAllQueues);

// All queue management is admin-only → apply protect to all routes
router.use(protect);

// GET  /api/queue/:departmentId            → full sorted queue for one dept
router.get('/:departmentId', getQueue);

// POST /api/queue/:departmentId/next       → call next patient
router.post('/:departmentId/next', callNext);

// POST /api/queue/:departmentId/emergency  → insert emergency patient
router.post('/:departmentId/emergency', insertEmergency);

// POST /api/queue/token/:tokenId/skip      → skip a patient
router.post('/token/:tokenId/skip', skipToken);

// POST /api/queue/token/:tokenId/complete  → mark completed
router.post('/token/:tokenId/complete', completeToken);

module.exports = router;
