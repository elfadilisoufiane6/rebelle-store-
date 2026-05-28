const fetch = require('node-fetch');
const { env } = require('../config/env');
const log = require('../utils/logger');

// Format a Date to DD/MM/YYYY (Morocco operational convention).
function formatDateDMY(input) {
  const d = input instanceof Date ? input : new Date(input);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Compose the 11-column ops payload sent to the Google Apps Script:
// date · order_id · country · name · phone · product · sku · quantity ·
// total · currency · status (always empty).
// Multi-item orders collapse product / sku / quantity into slash-
// separated strings, in the same order, so a row stays one line.
function buildSheetPayload(order) {
  const items = Array.isArray(order.items) ? order.items : [];

  const products = items
    .map((it) => it.product_name_en || it.product_name || it.product_id || '')
    .join('/');
  const skus = items.map((it) => it.sku || it.product_id || '').join('/');
  const quantities = items.map((it) => String(it.quantity || 1)).join('/');

  const total = Number(order.total_with_upsell || order.total || 0);

  return {
    date: formatDateDMY(order.created_at || Date.now()),
    order_id: order.order_id,
    country: 'MA',
    name: order.name || '',
    phone: order.phone_normalized || order.phone || '',
    product: products,
    sku: skus,
    quantity: quantities,
    total,
    currency: 'MAD',
    status: '',
  };
}

async function sendOrderToSheet(order) {
  if (!env.SHEETS_WEBHOOK_URL) {
    log.warn('SHEETS_WEBHOOK_URL not set — skipping sheets sync');
    return { sent: false, skipped: true };
  }

  const payload = buildSheetPayload(order);

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

module.exports = { sendOrderToSheet, buildSheetPayload };
