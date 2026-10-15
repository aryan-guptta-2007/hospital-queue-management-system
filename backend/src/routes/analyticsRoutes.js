const express = require('express');
const router = express.Router();
const {
  overview,
  tokensPerDay,
  peakHours,
  departments,
} = require('../controllers/analyticsController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const { validate } = require('../validators/validate');
const schemas = require('../validators/analyticsValidators');

// Reporting is administrator-only: it spans every department, which scoped
// staff are not allowed to see
router.use(protect, requireRole('admin'));

// GET /api/analytics/overview        → headline totals for the range
router.get('/overview', validate(schemas.rangeQuery), overview);

// GET /api/analytics/tokens-per-day  → trend, one row per department per day
router.get('/tokens-per-day', validate(schemas.rangeQuery), tokensPerDay);

// GET /api/analytics/peak-hours      → IST weekday × hour counts for the heatmap
router.get('/peak-hours', validate(schemas.rangeQuery), peakHours);

// GET /api/analytics/departments     → per-department wait, consultation, skip rate
router.get('/departments', validate(schemas.rangeQuery), departments);

module.exports = router;
