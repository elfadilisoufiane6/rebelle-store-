const { verify } = require('../utils/session');
const { env } = require('../config/env');

const COOKIE_NAME = 'rebelle_admin';

// Read the signed admin cookie out of the request and attach the
// payload to req.admin. Used by every /api/admin/* route.
function requireAdmin(req, res, next) {
  if (!env.ADMIN_SESSION_SECRET || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return res.status(503).json({
      success: false,
      error: 'Admin not configured — set ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_SESSION_SECRET',
    });
  }

  const raw = readCookie(req, COOKIE_NAME);
  const payload = raw ? verify(raw, env.ADMIN_SESSION_SECRET) : null;
  if (!payload || payload.sub !== env.ADMIN_USERNAME) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  req.admin = payload;
  next();
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const parts = header.split(/;\s*/);
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return null;
}

module.exports = { requireAdmin, COOKIE_NAME };
