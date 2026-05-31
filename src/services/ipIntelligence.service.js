// IP intelligence layer.
//
// Two concerns kept independent so providers can swap:
//   1. Country lookup  — defaults to MaxMind GeoLite2 country DB (local
//      .mmdb file). Free, offline, sub-millisecond, perfect for filter
//      queries. Falls back to ipapi.co when DB is missing.
//   2. VPN / proxy / hosting detection — third-party HTTP API. Defaults
//      to vpnapi.io but the request shape is generic enough that
//      ipqualityscore.com or proxycheck.io can be swapped in by env.
//
// Results are cached in-process for 6 h per IP so repeat visits don't
// burn API quota.

const fetch = require('node-fetch');
const { env } = require('../config/env');
const log = require('../utils/logger');

let maxmindReader = null;
let maxmindReady = null;

async function getMaxmindReader() {
  if (maxmindReader) return maxmindReader;
  if (maxmindReady) return maxmindReady;

  maxmindReady = (async () => {
    if (!env.MAXMIND_DB_PATH) return null;
    try {
      // Lazy-require so the dep is optional if the operator skips
      // the local-DB route.
      const maxmind = require('maxmind');
      const reader = await maxmind.open(env.MAXMIND_DB_PATH);
      maxmindReader = reader;
      log.info(`MaxMind GeoLite2 loaded from ${env.MAXMIND_DB_PATH}`);
      return reader;
    } catch (err) {
      log.warn(`MaxMind DB unavailable (${err.message}) — falling back to HTTP`);
      return null;
    }
  })();
  return maxmindReady;
}

// ──────────────────────────────────────────────
// In-memory TTL cache
// ──────────────────────────────────────────────
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map(); // ip -> { value, expiresAt }

function getCached(ip) {
  const hit = cache.get(ip);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(ip);
    return null;
  }
  return hit.value;
}

function setCached(ip, value) {
  cache.set(ip, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ──────────────────────────────────────────────
// Country lookup
// ──────────────────────────────────────────────

async function lookupCountry(ip) {
  if (!ip) return null;
  if (isPrivateIp(ip)) return null;

  const reader = await getMaxmindReader();
  if (reader) {
    try {
      const result = reader.get(ip);
      return result?.country?.iso_code || null;
    } catch (err) {
      log.warn('MaxMind lookup failed', err.message);
    }
  }

  // Fallback: ipapi.co (free 1k/day, no key)
  try {
    const res = await fetch(`https://ipapi.co/${ip}/country/`, {
      headers: { 'User-Agent': 'rebelle-backend/1.0' },
      timeout: 4_000,
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (text && /^[A-Z]{2}$/.test(text)) return text;
    return null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// VPN / proxy / hosting detection
// ──────────────────────────────────────────────

async function lookupVpnFlags(ip) {
  if (!ip || isPrivateIp(ip)) {
    return { is_vpn: false, is_proxy: false, is_hosting: false, provider: 'local' };
  }
  const provider = (env.VPN_API_PROVIDER || 'vpnapi').toLowerCase();
  if (!env.VPN_API_KEY) {
    return { is_vpn: null, is_proxy: null, is_hosting: null, provider: 'unset' };
  }

  try {
    if (provider === 'vpnapi') {
      const res = await fetch(
        `https://vpnapi.io/api/${encodeURIComponent(ip)}?key=${env.VPN_API_KEY}`,
        { timeout: 5_000 }
      );
      if (!res.ok) return errorResult(provider, `HTTP ${res.status}`);
      const json = await res.json();
      const s = json.security || {};
      return {
        is_vpn: !!s.vpn,
        is_proxy: !!s.proxy,
        is_hosting: !!s.hosting,
        provider,
      };
    }

    if (provider === 'ipqualityscore') {
      const res = await fetch(
        `https://ipqualityscore.com/api/json/ip/${encodeURIComponent(
          env.VPN_API_KEY
        )}/${encodeURIComponent(ip)}?strictness=1&allow_public_access_points=true`,
        { timeout: 5_000 }
      );
      if (!res.ok) return errorResult(provider, `HTTP ${res.status}`);
      const json = await res.json();
      return {
        is_vpn: !!json.vpn,
        is_proxy: !!json.proxy,
        is_hosting: !!json.is_crawler || !!json.bot_status,
        provider,
      };
    }

    if (provider === 'proxycheck') {
      const res = await fetch(
        `https://proxycheck.io/v2/${encodeURIComponent(ip)}?key=${env.VPN_API_KEY}&vpn=1&risk=1`,
        { timeout: 5_000 }
      );
      if (!res.ok) return errorResult(provider, `HTTP ${res.status}`);
      const json = await res.json();
      const entry = json[ip] || {};
      return {
        is_vpn: entry.proxy === 'yes' || entry.type === 'VPN',
        is_proxy: entry.proxy === 'yes',
        is_hosting: entry.type === 'Hosting' || entry.type === 'Data Center',
        provider,
      };
    }

    return errorResult(provider, 'unknown provider');
  } catch (err) {
    return errorResult(provider, err.message);
  }
}

function errorResult(provider, message) {
  log.warn(`VPN lookup (${provider}) failed: ${message}`);
  return { is_vpn: null, is_proxy: null, is_hosting: null, provider };
}

// ──────────────────────────────────────────────
// Combined helper used by the click tracker
// ──────────────────────────────────────────────

async function intel(ip) {
  if (!ip) return null;
  const cached = getCached(ip);
  if (cached) return cached;

  const [country, vpnFlags] = await Promise.all([
    lookupCountry(ip),
    lookupVpnFlags(ip),
  ]);

  const result = {
    ip,
    country,
    ...vpnFlags,
    is_valid_ma:
      country === 'MA' &&
      vpnFlags.is_vpn !== true &&
      vpnFlags.is_proxy !== true &&
      vpnFlags.is_hosting !== true,
    checked_at: new Date(),
  };

  setCached(ip, result);
  return result;
}

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────

function isPrivateIp(ip) {
  if (!ip) return true;
  // IPv4 mapped IPv6 ("::ffff:127.0.0.1") → strip
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (v4 === '127.0.0.1' || v4 === '::1' || v4 === 'localhost') return true;
  const parts = v4.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

module.exports = {
  lookupCountry,
  lookupVpnFlags,
  intel,
  isPrivateIp,
};
