const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { requireAdmin } = require('../middleware/adminAuth');
const ctrl = require('../controllers/admin.controller');

const router = Router();

// AI is expensive — cap per-admin requests so a runaway frontend can't
// burn an Anthropic budget.
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'AI rate limit reached. Wait a minute.' },
});

router.get('/capabilities', requireAdmin, ctrl.aiCapabilities);
router.post('/chat', requireAdmin, aiLimiter, ctrl.aiChat);
router.get('/chat/stream', requireAdmin, aiLimiter, ctrl.aiChatStream);

module.exports = router;
