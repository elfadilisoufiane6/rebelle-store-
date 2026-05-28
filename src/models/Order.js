const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    product_id: { type: String, required: true },
    product_name: { type: String, required: true },
    // English name shipped to ops sheet
    product_name_en: { type: String, default: null },
    sku: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1 },
    offer: { type: String, default: null },
    unit_price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    phone_normalized: { type: String, trim: true, maxlength: 20, index: true },
    city: { type: String, trim: true, maxlength: 100, default: null },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [(v) => v.length > 0, 'Order must contain at least one item'],
    },
    total: { type: Number, required: true, min: 0 },

    upsell_accepted: { type: Boolean, default: false },
    upsell_product_id: { type: String, default: null },
    upsell_product_name: { type: String, default: null },
    upsell_price: { type: Number, default: null },
    total_with_upsell: { type: Number, default: null },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Attribution
    utm_source: { type: String, default: null },
    utm_medium: { type: String, default: null },
    utm_campaign: { type: String, default: null },
    fbc: { type: String, default: null },
    fbp: { type: String, default: null },
    ttclid: { type: String, default: null },
    scid: { type: String, default: null },
    client_ip: { type: String, default: null },
    user_agent: { type: String, default: null },
    event_id: { type: String, default: null, index: true },

    // Side-effect tracking
    sheets_sent: { type: Boolean, default: false },
    capi_sent_meta: { type: Boolean, default: false },
    capi_sent_tiktok: { type: Boolean, default: false },
    capi_sent_snap: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Order', OrderSchema);
