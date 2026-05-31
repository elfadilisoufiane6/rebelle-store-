const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { env } = require('./config/env');
const ordersRoutes = require('./routes/orders.routes');
const healthRoutes = require('./routes/health.routes');
const trackRoutes = require('./routes/track.routes');
const adminRoutes = require('./routes/admin.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (env.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/', (req, res) => {
  res.json({
    name: 'Rebelle API',
    version: '1.0.0',
    docs: 'See README.md',
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
