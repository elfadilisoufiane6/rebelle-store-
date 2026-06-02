// Date range parsing for /metrics, /orders, /ads endpoints.
//
// Supports:
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD       (whole days inclusive)
//   ?from=ISO&to=ISO                     (full ISO timestamps)
//   (omitted)                            → last 30 days

function isoDay(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

function parseDateRange(query) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 29);
  defaultFrom.setHours(0, 0, 0, 0);

  const defaultTo = new Date(now);
  defaultTo.setHours(23, 59, 59, 999);

  const from = query.from ? new Date(query.from) : defaultFrom;
  const to = query.to ? new Date(query.to) : defaultTo;

  // If the caller passed bare YYYY-MM-DD, force end-of-day on `to`
  // so the range covers the whole day.
  if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) {
    to.setHours(23, 59, 59, 999);
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw Object.assign(new Error('Invalid date range'), { status: 400 });
  }
  return { from, to };
}

module.exports = { parseDateRange, isoDay };
