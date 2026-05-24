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

## Local dev with Docker

Spins up Mongo 7 + the API together. Single command:

```bash
cp .env.example .env
docker compose up --build
```

- API → http://localhost:3001
- Mongo → mongodb://localhost:27017 (data persisted in named volume `mongo_data`)

Stop with `docker compose down`. Wipe data with `docker compose down -v`.

---

## Production deployment — Easypanel

The repo ships a production `Dockerfile` (Node 18-alpine, non-root, healthcheck on `/api/health`).

### 1. MongoDB service (one-time)

1. In Easypanel, **Services → + Create Service → MongoDB**
2. Name it `mongo` (the hostname other services use to reach it)
3. Pick a version (≥ 6 recommended) and click **Create**

Once running, the connection string from any other service in the same project is:

```
mongodb://mongo:27017/rebelle
```

### 2. Backend service

1. **Services → + Create Service → App**
2. **Source → GitHub** → `elfadilisoufiane6/rebelle-store-` → branch `main`
3. **Build → Dockerfile** (auto-detected)
4. **Environment** — paste the contents of `.env.example` and override:
   ```env
   MONGODB_URI=mongodb://mongo:27017/rebelle
   ALLOWED_ORIGINS=https://rebelle.ma,https://www.rebelle.ma
   ```
5. **Ports → 3001** exposed
6. **Domains → + Add Domain** → `api.rebelle.ma` (Easypanel handles Let's Encrypt automatically)
7. Click **Deploy**

### 3. DNS (Cloudflare or registrar)

Add an `A` record for `api.rebelle.ma` pointing to your Easypanel server's public IP.

### 4. Verify

```bash
curl https://api.rebelle.ma/api/health
# → { "status":"ok", "db":"connected", ... }
```

---

## Production deployment — other hosts

Any Node-friendly host works (Railway, Render, Fly.io, VPS with `docker compose up -d`).

Minimum checklist regardless of host:

1. Set every `*_URI`, `*_TOKEN`, `*_PIXEL_ID` env var.
2. Whitelist `https://rebelle.ma` (and `www.`) in `ALLOWED_ORIGINS`.
3. Point your DNS subdomain (`api.rebelle.ma`) to the host.
4. Enable HTTPS (Cloudflare or host-provided).

---

## License

Private — Rebelle Store, 2026.
