const Order = require('../models/Order');
const { generateOrderId } = require('../utils/orderId');
const { normalizePhone } = require('../utils/phone');
const sheets = require('../services/sheets.service');
const metaCapi = require('../services/meta-capi.service');
const tiktokCapi = require('../services/tiktok-capi.service');
const log = require('../utils/logger');

async function createOrder(req, res, next) {
  try {
    const body = req.body;
    const phone_normalized =
      body.phone_normalized || normalizePhone(body.phone);

    const order = await Order.create({
      order_id: generateOrderId(),
      name: body.name,
      phone: body.phone,
      phone_normalized,
      city: body.city || null,
      items: body.items,
      total: body.total,

      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      fbc: body.fbc || null,
      fbp: body.fbp || null,
      ttclid: body.ttclid || null,
      scid: body.scid || null,
      client_ip: req.ip,
      user_agent: req.get('user-agent') || null,
      event_id: body.event_id || null,
    });

    // Fire side effects in background — never block the response
    fireSideEffects(order).catch((err) =>
      log.error('Side-effects failed', err.message)
    );

    res.status(201).json({ success: true, order_id: order.order_id });
  } catch (err) {
    next(err);
  }
}

async function addUpsell(req, res, next) {
  try {
    const { id } = req.params;
    const { product_id, product_name, upsell_price } = req.body;

    const order = await Order.findOne({ order_id: id });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, error: 'Order not found' });
    }
    if (order.upsell_accepted) {
      return res
        .status(409)
        .json({ success: false, error: 'Upsell already added' });
    }

    order.upsell_accepted = true;
    order.upsell_product_id = product_id;
    order.upsell_product_name = product_name;
    order.upsell_price = upsell_price;
    order.total_with_upsell = order.total + upsell_price;
    await order.save();

    fireSideEffects(order, { upsell: true }).catch((err) =>
      log.error('Upsell side-effects failed', err.message)
    );

    res.json({
      success: true,
      order_id: order.order_id,
      total: order.total_with_upsell,
    });
  } catch (err) {
    next(err);
  }
}

async function fireSideEffects(order, opts = {}) {
  const [sheetsRes, metaRes, tiktokRes] = await Promise.all([
    sheets.sendOrderToSheet(order),
    opts.upsell ? Promise.resolve({ skipped: true }) : metaCapi.sendPurchase(order),
    opts.upsell ? Promise.resolve({ skipped: true }) : tiktokCapi.sendPurchase(order),
  ]);

  const updates = {};
  if (sheetsRes.sent) updates.sheets_sent = true;
  if (metaRes.sent) updates.capi_sent_meta = true;
  if (tiktokRes.sent) updates.capi_sent_tiktok = true;

  if (Object.keys(updates).length > 0) {
    await Order.updateOne({ _id: order._id }, { $set: updates });
  }
}

module.exports = { createOrder, addUpsell };
