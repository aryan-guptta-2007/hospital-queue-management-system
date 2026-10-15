const Department = require('../models/Department');
const { createError } = require('../middleware/errorHandler');
const { recordInBackground, AUDIT_ACTIONS } = require('../services/auditLog');

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

    recordInBackground({
      user: req.user,
      action: AUDIT_ACTIONS.DEPARTMENT_CREATE,
      department: dept,
      details: `Created ${dept.name} (${dept.code})`,
    });

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

    recordInBackground({
      user: req.user,
      action: AUDIT_ACTIONS.DEPARTMENT_UPDATE,
      department: dept,
      // The fields the admin actually sent, not the whole document
      details: `Updated ${dept.name}: ${Object.keys(req.body).join(', ') || 'no changes'}`,
    });

    res.json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllDepartments, getDepartment, createDepartment, updateDepartment };
