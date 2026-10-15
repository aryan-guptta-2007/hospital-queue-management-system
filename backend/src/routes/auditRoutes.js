const express = require('express');
const router = express.Router();
const { getAuditLog, getAuditActions } = require('../controllers/auditController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { validate } = require('../validators/validate');
const schemas = require('../validators/auditValidators');

// The log covers every department and names individual staff members
router.use(protect, requireRole('admin'));

// GET /api/audit/actions → the filter's options
router.get('/actions', getAuditActions);

// GET /api/audit → filtered, paginated, newest first
router.get('/', validate(schemas.listQuery), getAuditLog);

module.exports = router;
