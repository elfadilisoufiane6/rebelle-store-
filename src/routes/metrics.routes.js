const { Router } = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const ctrl = require('../controllers/admin.controller');

const router = Router();

// Single endpoint behind /api/admin/metrics — returns current + previous
// period totals + deltas, plus orders status breakdown, timeseries and
// top products. See controller for exact schema.
router.get('/', requireAdmin, ctrl.metrics);

module.exports = router;
