const crypto = require('crypto');
const fetch = require('node-fetch');
const { env } = require('../config/env');
const log = require('../utils/logger');

const META_API_VERSION = 'v21.0';

function sha256(value) {
  if (!value) return undefined;
  return crypto
    .createHash('sha256')
    .update(String(value).trim().toLowerCase())
    .digest('hex');
}

async function sendPurchase(order) {
  if (!env.FB_PIXEL_ID || !env.FB_ACCESS_TOKEN) {
    return { sent: false, skipped: true };
  }

  const eventTime = Math.floor(Date.parse(order.created_at) / 1000) || Math.floor(Date.now() / 1000);
  const value = order.total_with_upsell || order.total;

  const eventData = {
    event_name: 'Purchase',
    event_time: eventTime,
    event_id: order.event_id || order.order_id,
    action_source: 'website',
    user_data: {
      ph: sha256(order.phone_normalized || order.phone),
      fn: sha256(order.name),
      country: sha256('ma'),
      client_ip_address: order.client_ip || undefined,
      client_user_agent: order.user_agent || undefined,
      fbc: order.fbc || undefined,
      fbp: order.fbp || undefined,
    },
    custom_data: {
      currency: 'MAD',
      value,
      content_ids: order.items.map((it) => it.product_id),
      content_type: 'product',
      num_items: order.items.reduce((s, it) => s + it.quantity, 0),
      order_id: order.order_id,
    },
  };

  const body = {
    data: [eventData],
    ...(env.FB_TEST_EVENT_CODE
      ? { test_event_code: env.FB_TEST_EVENT_CODE }
      : {}),
  };

  const url = `https://graph.facebook.com/${META_API_VERSION}/${env.FB_PIXEL_ID}/events?access_token=${env.FB_ACCESS_TOKEN}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 10_000,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn('Meta CAPI error', json);
      return { sent: false, error: json.error?.message || res.statusText };
    }
    return { sent: true, response: json };
  } catch (err) {
    log.error('Meta CAPI request failed', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendPurchase };
