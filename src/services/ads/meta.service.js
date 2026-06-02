// Meta (Facebook) Marketing API — insights reader.
//
// Pulls campaign-level performance for a date range:
//   spend · purchases · revenue · CPA · ROAS · CTR · CPM · CPC
//
// Setup once:
//   1. Create a Meta App with "Marketing API" → "Standard Access"
//   2. Generate a System User Access Token with `ads_read` scope
//   3. Paste the token + ad account id (act_123...) into env

const fetch = require('node-fetch');
const { env } = require('../../config/env');
const log = require('../../utils/logger');

const META_API_VERSION = 'v21.0';

const PURCHASE_TYPES = new Set([
  'purchase',
  'offsite_conversion.fb_pixel_purchase',
  'omni_purchase',
  'onsite_conversion.purchase',
]);

function isConfigured() {
  return !!(env.META_AD_ACCOUNT_ID && env.META_ACCESS_TOKEN);
}

function sumActionField(rows, field) {
  if (!Array.isArray(rows)) return 0;
  return rows
    .filter((a) => PURCHASE_TYPES.has(a.action_type))
    .reduce((s, a) => s + (parseFloat(a[field]) || 0), 0);
}

function totalsFromItems(items) {
  const t = items.reduce(
    (acc, it) => {
      acc.spend += it.spend;
      acc.revenue += it.revenue;
      acc.purchases += it.purchases;
      acc.impressions += it.impressions;
      acc.clicks += it.clicks;
      acc.reach += it.reach;
      return acc;
    },
    { spend: 0, revenue: 0, purchases: 0, impressions: 0, clicks: 0, reach: 0 }
  );
  t.ctr = t.impressions > 0 ? t.clicks / t.impressions : 0;
  t.cpm = t.impressions > 0 ? (t.spend / t.impressions) * 1000 : 0;
  t.cpc = t.clicks > 0 ? t.spend / t.clicks : 0;
  t.cpa = t.purchases > 0 ? t.spend / t.purchases : null;
  t.roas = t.spend > 0 ? t.revenue / t.spend : 0;
  return t;
}

async function fetchInsights({ from, to }) {
  if (!isConfigured()) {
    return {
      ok: false,
      configured: false,
      error: 'META_AD_ACCOUNT_ID or META_ACCESS_TOKEN not set',
      items: [],
      totals: totalsFromItems([]),
    };
  }

  const accountId = env.META_AD_ACCOUNT_ID.startsWith('act_')
    ? env.META_AD_ACCOUNT_ID
    : `act_${env.META_AD_ACCOUNT_ID}`;

  const fields = [
    'campaign_name',
    'campaign_id',
    'spend',
    'impressions',
    'clicks',
    'ctr',
    'cpm',
    'cpc',
    'reach',
    'actions',
    'action_values',
  ].join(',');

  const params = new URLSearchParams({
    access_token: env.META_ACCESS_TOKEN,
    fields,
    level: 'campaign',
    time_range: JSON.stringify({ since: from, until: to }),
    limit: '50',
  });

  const url = `https://graph.facebook.com/${META_API_VERSION}/${accountId}/insights?${params.toString()}`;

  try {
    const res = await fetch(url, { timeout: 15_000 });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
      log.warn('Meta Ads insights error', json);
      return {
        ok: false,
        configured: true,
        error: json?.error?.message || `HTTP ${res.status}`,
        items: [],
        totals: totalsFromItems([]),
      };
    }

    const items = (json.data || []).map((row) => {
      const purchases = sumActionField(row.actions, 'value');
      const revenue = sumActionField(row.action_values, 'value');
      const spend = parseFloat(row.spend) || 0;
      const cpa = purchases > 0 ? spend / purchases : null;
      const roas = spend > 0 ? revenue / spend : 0;
      return {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        spend,
        revenue,
        purchases,
        impressions: parseInt(row.impressions, 10) || 0,
        clicks: parseInt(row.clicks, 10) || 0,
        ctr: parseFloat(row.ctr) || 0,
        cpm: parseFloat(row.cpm) || 0,
        cpc: parseFloat(row.cpc) || 0,
        reach: parseInt(row.reach, 10) || 0,
        cpa,
        roas,
      };
    });

    return {
      ok: true,
      configured: true,
      items,
      totals: totalsFromItems(items),
    };
  } catch (err) {
    log.error('Meta Ads fetch failed', err.message);
    return {
      ok: false,
      configured: true,
      error: err.message,
      items: [],
      totals: totalsFromItems([]),
    };
  }
}

module.exports = { fetchInsights, isConfigured };
