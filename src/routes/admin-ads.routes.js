const { Router } = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const ctrl = require('../controllers/admin.controller');

const router = Router();

// Spec endpoints — /metrics suffix to match the user's API contract.
router.get('/meta/metrics', requireAdmin, ctrl.metaAdsInsights);
router.get('/tiktok/metrics', requireAdmin, ctrl.tiktokAdsInsights);

// Shorter aliases used by some clients
router.get('/meta', requireAdmin, ctrl.metaAdsInsights);
router.get('/tiktok', requireAdmin, ctrl.tiktokAdsInsights);

module.exports = router;
