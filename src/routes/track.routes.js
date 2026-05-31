const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { trackEvent } = require('../controllers/track.controller');

const router = Router();

// Tracking is high-volume and low-value-per-request — keep limits
// generous per visitor but strict per IP to prevent abuse.
const trackLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post('/click', trackLimiter, trackEvent);

module.exports = router;
