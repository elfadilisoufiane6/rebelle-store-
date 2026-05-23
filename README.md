# Rebelle Backend — Orders API

Node + Express + MongoDB API for the Rebelle Store (Maroc · COD).

Handles order creation, Google Sheets sync (CRM), Meta Conversions API, TikTok Events API, and upsell tracking.

---

## Stack

| Layer        | Choice                          |
| ------------ | ------------------------------- |
| Runtime      | Node.js ≥ 18                    |
| HTTP         | Express 4                       |
| Database     | MongoDB (Mongoose 8)            |
| Validation   | Zod                             |
| Security     | helmet · cors · rate-limit      |
| Side effects | Google Sheets webhook · Meta CAPI · TikTok Events API |

---

## Quick start

```bash
git clone https://github.com/elfadilisoufiane6/rebelle-store-.git rebelle-backend
cd rebelle-backend
npm install
cp .env.example .env
# fill MONGODB_URI, ALLOWED_ORIGINS at minimum
npm run dev
```

Server listens on `http://localhost:3001`.

Health check:

```bash
curl http://localhost:3001/api/health
```

---

## API

### `GET /api/health`

```json
{
  "status": "ok",
  "service": "rebelle-backend",
  "db": "connected",
  "uptime_seconds": 42,
  "timestamp": "2026-05-23T22:00:00.000Z"
}
```

### `POST /api/orders`

Creates an order. Fires (background, non-blocking) Sheets webhook + Meta CAPI + TikTok Events API.

**Request body**:

```json
{
  "name": "Fatima",
  "phone": "0661234567",
  "city": "Casablanca",
  "items": [
    {
      "product_id": "gucci-marmont-noir",
      "product_name": "Le Marmont — Édition Noir",
      "quantity": 2,
      "offer": "2pieces",
      "unit_price": 699
    }
  ],
  "total": 699,
  "event_id": "uuid-v4-from-frontend",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "rebelle_may2026",
  "fbc": "_fbc_cookie",
  "fbp": "_fbp_cookie",
  "ttclid": "ttclid_value"
}
```

**Response** (`201 Created`):

```json
{ "success": true, "order_id": "RB-2026-00042" }
```

### `POST /api/orders/:id/upsell`

Adds a post-purchase upsell item to an existing order.

**Request body**:

```json
{
  "product_id": "lv-catchy-pm",
  "product_name": "Le Catchy — Édition PM",
  "upsell_price": 469
}
```

**Response**:

```json
{ "success": true, "order_id": "RB-2026-00042", "total": 1168 }
```

---

## Project layout

```
rebelle-backend/
├── server.js                    # entrypoint
├── src/
│   ├── app.js                   # express instance
│   ├── config/
│   │   ├── db.js                # mongoose connect
│   │   └── env.js               # typed env access
│   ├── models/
│   │   └── Order.js             # mongoose schema
│   ├── routes/
│   │   ├── health.routes.js
│   │   └── orders.routes.js
│   ├── controllers/
│   │   └── orders.controller.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── rateLimit.js
│   │   └── validateOrder.js     # zod validation
│   ├── services/
│   │   ├── sheets.service.js    # Google Apps Script webhook
│   │   ├── meta-capi.service.js # Facebook Conversions API
│   │   └── tiktok-capi.service.js
│   └── utils/
│       ├── logger.js
│       ├── orderId.js           # RB-YYYY-NNNNN format
│       └── phone.js             # MA validation + normalisation
└── .env.example
```

---

## Frontend integration

The frontend (`https://github.com/elfadilisoufiane6/rebelle-store`) calls these endpoints from `components/checkout/CheckoutModal.tsx`.

Set the public env var in the frontend:

```env
NEXT_PUBLIC_API_URL=https://api.rebelle.ma
```

---

## CORS

Configure `ALLOWED_ORIGINS` as a comma-separated list:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://rebelle.ma,https://www.rebelle.ma
```

Requests without an `Origin` header (server-to-server, curl) are allowed.

---

## Production deployment

Any Node-friendly host works (Railway, Render, Fly.io, VPS).

Minimum:

1. Set every `*_URI`, `*_TOKEN`, `*_PIXEL_ID` env var.
2. Whitelist `https://rebelle.ma` in `ALLOWED_ORIGINS`.
3. Point your DNS subdomain (`api.rebelle.ma`) to the host.
4. Enable HTTPS (Cloudflare or host-provided).

---

## License

Private — Rebelle Store, 2026.
