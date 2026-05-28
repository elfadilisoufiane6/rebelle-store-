const { z } = require('zod');
const { validatePhone } = require('../utils/phone');

const OrderItemSchema = z.object({
  product_id: z.string().min(1),
  product_name: z.string().min(1),
  product_name_en: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  offer: z.string().optional().nullable(),
  unit_price: z.number().nonnegative(),
});

const CreateOrderSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().refine(validatePhone, {
    message: 'Invalid Moroccan phone number',
  }),
  phone_normalized: z.string().optional(),
  city: z.string().max(100).optional().nullable(),
  items: z.array(OrderItemSchema).min(1),
  total: z.number().nonnegative(),

  event_id: z.string().optional(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  fbc: z.string().optional().nullable(),
  fbp: z.string().optional().nullable(),
  ttclid: z.string().optional().nullable(),
  scid: z.string().optional().nullable(),
});

const UpsellSchema = z.object({
  product_id: z.string().min(1),
  product_name: z.string().min(1),
  upsell_price: z.number().positive(),
});

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }
    req.body = parsed.data;
    next();
  };
}

module.exports = {
  validateCreateOrder: validate(CreateOrderSchema),
  validateUpsell: validate(UpsellSchema),
};
