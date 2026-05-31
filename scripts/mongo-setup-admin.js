/**
 * MongoDB setup for admin dashboard + click tracking.
 *
 * Run once after deploying the new backend, against the same MongoDB
 * the API connects to. Creates indexes on `click_events` and
 * `orders` collections that the admin endpoints rely on.
 *
 * Two ways to run:
 *
 *   A. From mongosh (inside the Mongo container or locally with a
 *      tunnel):
 *
 *        mongosh "mongodb://USER:PASS@HOST:27017/rebelle?authSource=admin" \
 *          --file scripts/mongo-setup-admin.js
 *
 *   B. From Easypanel → mongo service → Console tab, paste line by
 *      line after `use rebelle`.
 *
 * Indexes are idempotent (safe to re-run).
 */

const db = db.getSiblingDB('rebelle');

// click_events — written by /api/track/click, read by /api/admin/metrics
db.click_events.createIndex({ visitor_id: 1 });
db.click_events.createIndex({ created_at: -1 });
db.click_events.createIndex({ event_type: 1 });
db.click_events.createIndex({ is_valid_ma: 1 });
db.click_events.createIndex({ ip: 1 });
db.click_events.createIndex({ created_at: -1, is_valid_ma: 1 });
db.click_events.createIndex({ created_at: -1, event_type: 1 });

// Optional: auto-expire raw click events after 180 days to bound
// storage. Comment out if you want to keep history forever.
db.click_events.createIndex(
  { created_at: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 180, name: 'click_events_ttl_180d' }
);

// orders — already exist but be explicit so the admin filters are fast
db.orders.createIndex({ order_id: 1 }, { unique: true });
db.orders.createIndex({ phone_normalized: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ created_at: -1 });
db.orders.createIndex({ event_id: 1 });

print('✓ Admin dashboard indexes created on rebelle DB');
print('  Collections:');
db.getCollectionNames().forEach(function (c) {
  print('    - ' + c);
});
