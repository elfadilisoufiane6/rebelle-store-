// TikTok Marketing API — reporting / insights reader.
//
// Pulls campaign-level performance for a date range:
//   spend · purchases · revenue · CPA · ROAS · CTR · CPM · CPC

const fetch = require('node-fetch');
const { env } = require('../../config/env');
const log = require('../../utils/logger');

const TT_API = 'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/';

function isConfigured() {
  return !!(env.TIKTOK_ADVERTISER_ID && env.TIKTOK_ACCESS_TOKEN);
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
      error: 'TIKTOK_ADVERTISER_ID or TIKTOK_ACCESS_TOKEN not set',
      items: [],
      totals: totalsFromItems([]),
    };
  }

  const body = {
    advertiser_id: env.TIKTOK_ADVERTISER_ID,
    report_type: 'BASIC',
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: ['campaign_id', 'campaign_name'],
    metrics: [
      'spend',
      'impressions',
      'clicks',
      'ctr',
      'cpm',
      'cpc',
      'conversion',
      'total_purchase',
      'total_purchase_value',
      'cost_per_conversion',
      'reach',
    ],
    start_date: from,
    end_date: to,
    page: 1,
    page_size: 50,
  };

  const params = new URLSearchParams();
  Object.entries(body).forEach(([k, v]) => {
    params.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  });

  try {
    const res = await fetch(`${TT_API}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Access-Token': env.TIKTOK_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.code !== 0) {
      log.warn('TikTok Ads insights error', json);
      return {
        ok: false,
        configured: true,
        error: json?.message || `HTTP ${res.status}`,
        items: [],
        totals: totalsFromItems([]),
      };
    }

    const rows = json.data?.list || [];
    const items = rows.map((row) => {
      const m = row.metrics || {};
      const d = row.dimensions || {};
      const spend = parseFloat(m.spend) || 0;
      const purchases =
        parseInt(m.total_purchase, 10) || parseInt(m.conversion, 10) || 0;
      const revenue = parseFloat(m.total_purchase_value) || 0;
      const cpa = purchases > 0 ? spend / purchases : null;
      const roas = spend > 0 ? revenue / spend : 0;
      return {
        campaign_id: d.campaign_id,
        campaign_name: d.campaign_name,
        spend,
        revenue,
        purchases,
        impressions: parseInt(m.impressions, 10) || 0,
        clicks: parseInt(m.clicks, 10) || 0,
        ctr: parseFloat(m.ctr) || 0,
        cpm: parseFloat(m.cpm) || 0,
        cpc: parseFloat(m.cpc) || 0,
        reach: parseInt(m.reach, 10) || 0,
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
    log.error('TikTok Ads fetch failed', err.message);
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
