const { Router } = require('express');
const {
  createOrder,
  addUpsell,
} = require('../controllers/orders.controller');
const {
  validateCreateOrder,
  validateUpsell,
} = require('../middleware/validateOrder');
const { orderLimiter } = require('../middleware/rateLimit');

const router = Router();

router.post('/', orderLimiter, validateCreateOrder, createOrder);
router.post('/:id/upsell', orderLimiter, validateUpsell, addUpsell);

module.exports = router;
