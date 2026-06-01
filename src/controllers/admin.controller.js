const crypto = require('crypto');
const Order = require('../models/Order');
const ClickEvent = require('../models/ClickEvent');
const { sign } = require('../utils/session');
const { COOKIE_NAME } = require('../middleware/adminAuth');
const { env } = require('../config/env');

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────

async function login(req, res) {
  const { username, password } = req.body || {};
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return res.status(503).json({
      success: false,
      error: 'Admin credentials not configured',
    });
  }
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !safeEqual(username, env.ADMIN_USERNAME) ||
    !safeEqual(password, env.ADMIN_PASSWORD)
  ) {
    // Constant-ish delay to deter brute force without blocking
    setTimeout(() => {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }, 600);
    return;
  }

  const SESSION_MS = 24 * 60 * 60 * 1000 * 7; // 7 days
  const token = sign(
    { sub: env.ADMIN_USERNAME, exp: Date.now() + SESSION_MS },
    env.ADMIN_SESSION_SECRET
  );

  res.setHeader('Set-Cookie', buildCookie(token, SESSION_MS / 1000));
  res.json({ success: true, user: { username } });
}

async function logout(_req, res) {
  res.setHeader('Set-Cookie', buildCookie('', 0));
  res.json({ success: true });
}

async function me(req, res) {
  res.json({ success: true, user: { username: req.admin.sub } });
}

// ──────────────────────────────────────────────
// Metrics
// ──────────────────────────────────────────────

// GET /api/admin/metrics?from=2026-05-01&to=2026-05-31&validMaOnly=true
async function metrics(req, res, next) {
  try {
    const { from, to } = parseDateRange(req.query);
    const validMaOnly =
      String(req.query.validMaOnly || 'true').toLowerCase() !== 'false';

    const clickMatch = { created_at: { $gte: from, $lt: to } };
    if (validMaOnly) clickMatch.is_valid_ma = true;

    const orderMatch = { created_at: { $gte: from, $lt: to } };

    const [
      totalClicks,
      totalValidClicks,
      eventCounts,
      ordersAgg,
      clicksByDay,
      ordersByDay,
      ordersByStatus,
      topProducts,
    ] = await Promise.all([
      ClickEvent.countDocuments({ created_at: { $gte: from, $lt: to } }),
      ClickEvent.countDocuments({
        created_at: { $gte: from, $lt: to },
        is_valid_ma: true,
      }),
      ClickEvent.aggregate([
        { $match: clickMatch },
        { $group: { _id: '$event_type', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$total_with_upsell', '$total'] } },
          },
        },
      ]),
      ClickEvent.aggregate([
        { $match: clickMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$created_at' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$created_at' },
            },
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$total_with_upsell', '$total'] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: orderMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: orderMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              product_id: '$items.product_id',
              product_name: '$items.product_name',
            },
            qty: { $sum: '$items.quantity' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { qty: -1 } },
        { $limit: 6 },
      ]),
    ]);

    const orderTotals = ordersAgg[0] || { count: 0, revenue: 0 };
    const conversionBase = validMaOnly ? totalValidClicks : totalClicks;
    const conversion_rate =
      conversionBase > 0 ? orderTotals.count / conversionBase : 0;
    const avg_order_value =
      orderTotals.count > 0 ? orderTotals.revenue / orderTotals.count : 0;

    res.json({
      success: true,
      range: { from, to, valid_ma_only: validMaOnly },
      totals: {
        clicks: totalClicks,
        valid_ma_clicks: totalValidClicks,
        orders: orderTotals.count,
        revenue: orderTotals.revenue,
        conversion_rate,
        avg_order_value,
      },
      events_by_type: collapseToObject(eventCounts),
      orders_by_status: collapseToObject(ordersByStatus),
      timeseries: fillDateSeries(from, to, clicksByDay, ordersByDay),
      top_products: topProducts.map((row) => ({
        product_id: row._id.product_id,
        product_name: row._id.product_name,
        qty: row.qty,
        orders: row.orders,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ──────────────────────────────────────────────
// Orders list + detail
// ──────────────────────────────────────────────

// GET /api/admin/orders?from=...&to=...&status=...&q=...&page=1&pageSize=20
async function listOrders(req, res, next) {
  try {
    const { from, to } = parseDateRange(req.query);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

    const filter = { created_at: { $gte: from, $lt: to } };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [
        { order_id: rx },
        { name: rx },
        { phone: rx },
        { phone_normalized: rx },
      ];
    }

    const [total, items] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    res.json({
      success: true,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
      items,
    });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await Order.findOne({ order_id: req.params.id }).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body || {};
    const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ success: false, error: `status must be one of ${allowed.join(', ')}` });
    }
    const order = await Order.findOneAndUpdate(
      { order_id: req.params.id },
      { $set: { status } },
      { new: true }
    ).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

async function deleteOrder(req, res, next) {
  try {
    const result = await Order.deleteOne({ order_id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    next(err);
  }
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function parseDateRange(query) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 29);
  defaultFrom.setHours(0, 0, 0, 0);

  const defaultTo = new Date(now);
  defaultTo.setHours(23, 59, 59, 999);

  const from = query.from ? new Date(query.from) : defaultFrom;
  const to = query.to ? new Date(query.to) : defaultTo;

  // Make "to" exclusive end-of-day if it's a YYYY-MM-DD with no time
  if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) {
    to.setHours(23, 59, 59, 999);
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw Object.assign(new Error('Invalid date range'), { status: 400 });
  }
  return { from, to };
}

function collapseToObject(rows) {
  const out = {};
  for (const r of rows) out[r._id || 'unknown'] = r.count;
  return out;
}

function fillDateSeries(from, to, clickRows, orderRows) {
  const clicksByDate = new Map(clickRows.map((r) => [r._id, r.count]));
  const ordersByDate = new Map(orderRows.map((r) => [r._id, r.count]));
  const revenueByDate = new Map(orderRows.map((r) => [r._id, r.revenue]));

  const series = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({
      date: key,
      clicks: clicksByDate.get(key) || 0,
      orders: ordersByDate.get(key) || 0,
      revenue: revenueByDate.get(key) || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Builds the Set-Cookie header string. When ADMIN_COOKIE_DOMAIN is
// set (e.g. ".rebelle.ma"), the cookie is shared between subdomains
// so the admin UI on rebelle.ma can talk to api.rebelle.ma.
// SameSite=None + Secure is required for cross-site requests.
function buildCookie(token, maxAgeSec) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
  ];
  if (env.ADMIN_COOKIE_DOMAIN) {
    parts.push(`Domain=${env.ADMIN_COOKIE_DOMAIN}`);
  }
  // Cross-origin admin UI ↔ API needs SameSite=None + Secure
  const crossOrigin = !!env.ADMIN_COOKIE_DOMAIN;
  if (crossOrigin || env.NODE_ENV === 'production') {
    parts.push('SameSite=None');
    parts.push('Secure');
  } else {
    parts.push('SameSite=Lax');
  }
  parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`);
  return parts.join('; ');
}

module.exports = {
  login,
  logout,
  me,
  metrics,
  listOrders,
  getOrder,
  updateOrderStatus,
  deleteOrder,
};
