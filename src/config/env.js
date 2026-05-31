const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3001,

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rebelle',

  SHEETS_WEBHOOK_URL: process.env.SHEETS_WEBHOOK_URL || '',

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

  // Admin dashboard (single-user)
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || '',
  // Cookie Domain — must start with a leading dot so the cookie is
  // shared between rebelle.ma (admin UI) and api.rebelle.ma (auth
  // endpoint). Leave empty for local dev / single-host.
  ADMIN_COOKIE_DOMAIN: process.env.ADMIN_COOKIE_DOMAIN || '',

  // IP intelligence — MaxMind GeoLite2 (country DB, local .mmdb file)
  MAXMIND_DB_PATH: process.env.MAXMIND_DB_PATH || '',

  // VPN / proxy detection
  //   VPN_API_PROVIDER ∈ { vpnapi | ipqualityscore | proxycheck }
  VPN_API_PROVIDER: process.env.VPN_API_PROVIDER || 'vpnapi',
  VPN_API_KEY: process.env.VPN_API_KEY || '',
};

module.exports = { env };
