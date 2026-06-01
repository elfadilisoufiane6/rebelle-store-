const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { requireAdmin } = require('../middleware/adminAuth');
const ctrl = require('../controllers/admin.controller');

const router = Router();

// Throttle login attempts hard
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Try again later.' },
});

// Public (auth endpoints)
router.post('/login', loginLimiter, ctrl.login);
router.post('/logout', ctrl.logout);

// Everything else requires a valid admin cookie
router.get('/me', requireAdmin, ctrl.me);
router.get('/metrics', requireAdmin, ctrl.metrics);
router.get('/orders', requireAdmin, ctrl.listOrders);
router.get('/orders/:id', requireAdmin, ctrl.getOrder);
router.patch('/orders/:id/status', requireAdmin, ctrl.updateOrderStatus);
router.delete('/orders/:id', requireAdmin, ctrl.deleteOrder);

module.exports = router;
