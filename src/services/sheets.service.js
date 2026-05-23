const fetch = require('node-fetch');
const { env } = require('../config/env');
const log = require('../utils/logger');

async function sendOrderToSheet(order) {
  if (!env.SHEETS_WEBHOOK_URL) {
    log.warn('SHEETS_WEBHOOK_URL not set — skipping sheets sync');
    return { sent: false, skipped: true };
  }

  const totalQuantity = order.items.reduce((s, it) => s + it.quantity, 0);
  const subtotal = order.items.reduce(
    (s, it) => s + it.unit_price * it.quantity,
    0
  );

  const payload = {
    secret: env.SHEETS_SECRET,
    order_id: order.order_id,
    name: order.name,
    phone: order.phone,
    items: order.items.map((it) => ({
      product_name: it.product_name,
      quantity: it.quantity,
    })),
    offer_type: order.items[0]?.offer || null,
    total_quantity: totalQuantity,
    subtotal,
    upsell_accepted: order.upsell_accepted,
    upsell_amount: order.upsell_price || 0,
    total: order.total_with_upsell || order.total,
    utm_source: order.utm_source,
    utm_medium: order.utm_medium,
    utm_campaign: order.utm_campaign,
    client_ip: order.client_ip,
    fbc: order.fbc,
    fbp: order.fbp,
    ttclid: order.ttclid,
  };

  try {
    const res = await fetch(env.SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 10_000,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      log.warn('Sheets webhook responded with error', json);
      return { sent: false, error: json.error || res.statusText };
    }
    return { sent: true };
  } catch (err) {
    log.error('Sheets webhook failed', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendOrderToSheet };
