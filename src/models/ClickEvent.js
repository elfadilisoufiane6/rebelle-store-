const mongoose = require('mongoose');

// One document per tracked visitor interaction. The tracker on the
// frontend fires `pageview` on every route change; product pages and
// checkout flow also emit higher-intent events (product_view,
// add_to_cart, checkout_started, purchase) so the admin dashboard can
// compute funnel + conversion.
const ClickEventSchema = new mongoose.Schema(
  {
    event_type: {
      type: String,
      enum: [
        'pageview',
        'product_view',
        'add_to_cart',
        'checkout_started',
        'purchase',
      ],
      default: 'pageview',
      index: true,
    },

    visitor_id: { type: String, required: true, index: true },
    session_id: { type: String, default: null },

    path: { type: String, default: null },
    referrer: { type: String, default: null },
    product_id: { type: String, default: null },

    // Network
    ip: { type: String, default: null, index: true },
    user_agent: { type: String, default: null },

    // Attribution
    utm_source: { type: String, default: null },
    utm_medium: { type: String, default: null },
    utm_campaign: { type: String, default: null },
    fbc: { type: String, default: null },
    fbp: { type: String, default: null },
    ttclid: { type: String, default: null },
    scid: { type: String, default: null },

    // IP intelligence (populated async after the event lands)
    ip_country: { type: String, default: null, index: true },
    ip_is_vpn: { type: Boolean, default: null, index: true },
    ip_is_proxy: { type: Boolean, default: null },
    ip_is_hosting: { type: Boolean, default: null },
    ip_intel_provider: { type: String, default: null },
    ip_intel_checked_at: { type: Date, default: null },

    // Computed convenience flag — true only when the IP is from MA *and*
    // not flagged as VPN/proxy/hosting. The dashboard's "valid clicks"
    // counter filters on this.
    is_valid_ma: { type: Boolean, default: null, index: true },

    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Compound index for the dashboard's primary query:
// "give me valid MA clicks grouped by day, within a date range".
ClickEventSchema.index({ created_at: -1, is_valid_ma: 1 });
ClickEventSchema.index({ created_at: -1, event_type: 1 });

module.exports = mongoose.model('ClickEvent', ClickEventSchema);
