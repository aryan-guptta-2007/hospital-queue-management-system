const express = require('express');
const router = express.Router();
const {
  getAllDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
} = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

// GET  /api/departments       → public (patient form needs it)
router.get('/', getAllDepartments);
router.get('/:id', getDepartment);

// POST/PATCH  → admin only
router.post('/', protect, createDepartment);
router.patch('/:id', protect, updateDepartment);

module.exports = router;
