const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

const orderLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Trop de requêtes. Réessaie dans un instant.',
  },
});

module.exports = { orderLimiter };
