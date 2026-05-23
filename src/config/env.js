const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3001,

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rebelle',

  SHEETS_WEBHOOK_URL: process.env.SHEETS_WEBHOOK_URL || '',
  SHEETS_SECRET: process.env.SHEETS_SECRET || '',

  FB_PIXEL_ID: process.env.FB_PIXEL_ID || '',
  FB_ACCESS_TOKEN: process.env.FB_ACCESS_TOKEN || '',
  FB_TEST_EVENT_CODE: process.env.FB_TEST_EVENT_CODE || '',

  TT_PIXEL_ID: process.env.TT_PIXEL_ID || '',
  TT_ACCESS_TOKEN: process.env.TT_ACCESS_TOKEN || '',

  SC_PIXEL_ID: process.env.SC_PIXEL_ID || '',
  SC_ACCESS_TOKEN: process.env.SC_ACCESS_TOKEN || '',

  RATE_LIMIT_WINDOW_MS:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 20,
};

module.exports = { env };
