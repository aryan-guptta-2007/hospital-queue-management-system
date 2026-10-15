const express = require('express');
const router = express.Router();
const {
  getAllDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
} = require('../controllers/departmentController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { validate } = require('../validators/validate');
const schemas = require('../validators/departmentValidators');

// GET  /api/departments       → public (patient form needs it)
router.get('/', getAllDepartments);
router.get('/:id', validate(schemas.byId), getDepartment);

// POST/PATCH  → admin only
router.post('/', protect, requireRole('admin'), validate(schemas.create), createDepartment);
router.patch('/:id', protect, requireRole('admin'), validate(schemas.update), updateDepartment);

module.exports = router;
