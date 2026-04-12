const express = require('express');
const router = express.Router();
const {
  generatePatientToken,
  getTokenStatus,
  getCurrentToken,
} = require('../controllers/tokenController');

// POST /api/tokens/generate              → public (patient generates token)
router.post('/generate', generatePatientToken);

// GET  /api/tokens/:tokenNumber/status   → public (patient checks their token)
router.get('/:tokenNumber/status', getTokenStatus);

// GET  /api/tokens/current/:departmentId → public (what token is being served)
router.get('/current/:departmentId', getCurrentToken);

module.exports = router;
