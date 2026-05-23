const log = require('../utils/logger');

function notFound(req, res) {
  res.status(404).json({ success: false, error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  log.error('Unhandled error', err.stack || err.message || err);

  if (err.code === 11000) {
    return res
      .status(409)
      .json({ success: false, error: 'Duplicate order' });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.publicMessage || 'Internal server error',
  });
}

module.exports = { notFound, errorHandler };
