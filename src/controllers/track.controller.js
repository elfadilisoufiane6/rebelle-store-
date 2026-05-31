const ClickEvent = require('../models/ClickEvent');
const ipIntel = require('../services/ipIntelligence.service');
const log = require('../utils/logger');

// Persist the event immediately so the response is fast (<10 ms),
// then asynchronously run IP intelligence and update the document.
// The dashboard's "valid clicks" query filters on the eventual
// is_valid_ma flag, so the brief delay between event landing and
// flag being set is acceptable.
async function trackEvent(req, res) {
  try {
    const b = req.body || {};
    const ip =
      (req.headers['cf-connecting-ip'] ||
        req.headers['x-real-ip'] ||
        (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.ip ||
        '').toString();

    const ua = req.get('user-agent') || null;

    const doc = await ClickEvent.create({
      event_type: b.event_type || 'pageview',
      visitor_id: b.visitor_id,
      session_id: b.session_id || null,
      path: b.path || null,
      referrer: b.referrer || null,
      product_id: b.product_id || null,
      ip,
      user_agent: ua,
      utm_source: b.utm_source || null,
      utm_medium: b.utm_medium || null,
      utm_campaign: b.utm_campaign || null,
      fbc: b.fbc || null,
      fbp: b.fbp || null,
      ttclid: b.ttclid || null,
      scid: b.scid || null,
    });

    // Fire-and-forget IP enrichment
    enrichIp(doc._id, ip).catch((err) =>
      log.error('IP enrichment failed', err.message)
    );

    res.status(202).json({ success: true });
  } catch (err) {
    log.error('track event failed', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
}

async function enrichIp(docId, ip) {
  const intel = await ipIntel.intel(ip);
  if (!intel) return;
  await ClickEvent.updateOne(
    { _id: docId },
    {
      $set: {
        ip_country: intel.country,
        ip_is_vpn: intel.is_vpn,
        ip_is_proxy: intel.is_proxy,
        ip_is_hosting: intel.is_hosting,
        ip_intel_provider: intel.provider,
        ip_intel_checked_at: intel.checked_at,
        is_valid_ma: intel.is_valid_ma,
      },
    }
  );
}

module.exports = { trackEvent };
