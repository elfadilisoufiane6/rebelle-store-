const { Router } = require('express');
const mongoose = require('mongoose');

const router = Router();

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.json({
    status: 'ok',
    service: 'rebelle-backend',
    db: dbState === 1 ? 'connected' : 'disconnected',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
