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

  // ──────── AI assistant (Anthropic Claude) ────────
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  AI_API_KEY: process.env.AI_API_KEY || '', // generic fallback
  AI_MODEL: process.env.AI_MODEL || '',

  // ──────── Meta Marketing API (ads insights) ────────
  META_APP_ID: process.env.META_APP_ID || '',
  META_APP_SECRET: process.env.META_APP_SECRET || '',
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN || '',
  META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID || '',

  // ──────── TikTok Marketing API (ads insights) ────────
  TIKTOK_ACCESS_TOKEN: process.env.TIKTOK_ACCESS_TOKEN || '',
  TIKTOK_ADVERTISER_ID: process.env.TIKTOK_ADVERTISER_ID || '',
};

// Validate env at startup. Distinguishes between hard errors (missing
// required vars — boot is aborted) and warnings (optional features
// disabled but app still runs).
function validateEnv() {
  const errors = [];
  const warnings = [];

  // Hard requirements
  if (!env.MONGODB_URI) errors.push('MONGODB_URI is required');
  if (env.NODE_ENV === 'production' && !env.ADMIN_SESSION_SECRET) {
    errors.push('ADMIN_SESSION_SECRET must be set in production');
  }

  // Optional features
  if (!env.ANTHROPIC_API_KEY && !env.AI_API_KEY) {
    warnings.push('AI assistant disabled — set ANTHROPIC_API_KEY');
  }
  if (!env.META_ACCESS_TOKEN || !env.META_AD_ACCOUNT_ID) {
    warnings.push(
      'Meta Ads insights disabled — set META_ACCESS_TOKEN + META_AD_ACCOUNT_ID'
    );
  }
  if (!env.TIKTOK_ACCESS_TOKEN || !env.TIKTOK_ADVERTISER_ID) {
    warnings.push(
      'TikTok Ads insights disabled — set TIKTOK_ACCESS_TOKEN + TIKTOK_ADVERTISER_ID'
    );
  }
  if (!env.SHEETS_WEBHOOK_URL) {
    warnings.push('Google Sheets sync disabled — set SHEETS_WEBHOOK_URL');
  }
  if (!env.MAXMIND_DB_PATH) {
    warnings.push(
      'MaxMind GeoLite2 disabled — falling back to ipapi.co (1k/day)'
    );
  }

  return { errors, warnings };
}

module.exports = { env, validateEnv };

module.exports = { env };
