const Department = require('../models/Department');
const { createError } = require('../middleware/errorHandler');

// ── GET /api/departments ───────────────────────────────────
// Public — patient needs this to fill the token form
const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true }).sort('name');
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/departments/:id ───────────────────────────────
const getDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) throw createError('Department not found', 404);
    res.json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/departments  (admin only) ────────────────────
const createDepartment = async (req, res, next) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/departments/:id  (admin only) ───────────────
const updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!dept) throw createError('Department not found', 404);
    res.json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllDepartments, getDepartment, createDepartment, updateDepartment };
