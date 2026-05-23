const crypto = require('crypto');
const fetch = require('node-fetch');
const { env } = require('../config/env');
const log = require('../utils/logger');

const TT_ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

function sha256(value) {
  if (!value) return undefined;
  return crypto
    .createHash('sha256')
    .update(String(value).trim().toLowerCase())
    .digest('hex');
}

async function sendPurchase(order) {
  if (!env.TT_PIXEL_ID || !env.TT_ACCESS_TOKEN) {
    return { sent: false, skipped: true };
  }

  const value = order.total_with_upsell || order.total;
  const eventTime = Math.floor(Date.parse(order.created_at) / 1000) || Math.floor(Date.now() / 1000);

  const body = {
    event_source: 'web',
    event_source_id: env.TT_PIXEL_ID,
    data: [
      {
        event: 'CompletePayment',
        event_time: eventTime,
        event_id: order.event_id || order.order_id,
        user: {
          phone: sha256(order.phone_normalized || order.phone),
          first_name: sha256(order.name),
          ip: order.client_ip || undefined,
          user_agent: order.user_agent || undefined,
          ttclid: order.ttclid || undefined,
        },
        properties: {
          currency: 'MAD',
          value,
          contents: order.items.map((it) => ({
            content_id: it.product_id,
            content_name: it.product_name,
            quantity: it.quantity,
            price: it.unit_price,
          })),
          order_id: order.order_id,
        },
      },
    ],
  };

  try {
    const res = await fetch(TT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': env.TT_ACCESS_TOKEN,
      },
      body: JSON.stringify(body),
      timeout: 10_000,
    });
    const json = await res.json().catch(() => ({}));
    if (json.code !== 0) {
      log.warn('TikTok Events API error', json);
      return { sent: false, error: json.message || 'TikTok API error' };
    }
    return { sent: true, response: json };
  } catch (err) {
    log.error('TikTok Events API failed', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendPurchase };
