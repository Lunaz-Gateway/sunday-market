# Lunaz demo app

Reference clients for the Lunaz Zcash payment gateway. Built with TanStack Start (React 19), Vite 8, Tailwind 4 and Biome. The package manager is bun.

## Pages

Sunday Market is a small multi-seller marketplace. Each shop is a separate Lunaz merchant with its own account, viewing key, wallet and API key. One gateway serves many merchants: an order from a shop creates an invoice with that shop's key, so the payment goes privately to that seller's wallet.

- `/` is the marketplace home: search, category chips, featured shops and all products. Search and category are kept in the URL (`?q=`, `?c=`).
- `/shop/$slug` is a shop page. `/product/$id` is a product page with "Add to cart" and "Buy now".
- `/cart` groups the cart by shop. Each shop has its own checkout. The cart is kept in `localStorage`.
- `/checkout?seller=<slug>` is the checkout, in steps: Cart, Details, Payment, Done. It reads the shop's lines from the cart (or `&buy=<id>:<qty>` from "Buy now").
  - Details: optional email, name, address and note. This is a demo form: the values stay in the browser and are never sent to Lunaz or the shop.
  - Payment (`&step=payment`): pick "Zcash (shielded)" or "Other crypto" (USDC, USDT, SOL, ETH or BTC via NEAR Intents, from 0.001 ZEC). "Place order" creates the invoice.
- `/checkout/$invoiceId` is the payment page and the shareable, refresh-safe link for an order. It shows a Zcash QR code and address, live status over WebSocket, and the cross-chain deposit flow. When the payment is in, it shows the "Order confirmed — LUNAS" screen (lunas means paid in full) and removes the paid lines from the cart.
- `/pos` (the old cashier) and `/store` redirect to `/`.

Shops and products are defined in `src/lib/catalog.ts`. Shop slugs are the keys in `LUNAZ_SELLERS`, so don't rename them. Prices are computed on the server from the catalog, so the browser can't change them.

## API key stays on the server

Invoice calls (`src/lib/invoice.ts`) are TanStack server functions. They run on the server, look up the shop's key by its slug, and send `Authorization: Bearer <key>` to core-service. An unknown shop gets a 400. The key is never sent to the browser. The browser only receives the invoice, and opens a WebSocket to core-service for live status (`/v1/invoices/:id/ws`, no key needed).

## Orders and webhooks

Like a real merchant integration, the shop keeps its own orders in SQLite (`node:sqlite`, Node 22.13+, no extra dependency). `createOrder` creates the Lunaz invoice, then inserts an `orders` row (`pending`) with an order number like `SM-7K3QX9`. The payment panel still shows live status over WebSocket; the buyer's `/orders` and `/orders/$orderId` pages read the database and refresh every 5 s while an order is open. A browser only lists the order ids saved in its own `localStorage`.

Tables: `orders` (id, seller, invoice_id UNIQUE, lines JSON, amount_zat, status `pending|detected|paid|underpaid|expired`, received_zat, txid, contact_email, created_at, paid_at, updated_at) and `webhook_events` (every delivery with signature validity, the response code and, on the accepted delivery of each event, its `event_id` UNIQUE; the column is added in place on older databases).

Webhook receiver: `POST https://<demo host>/api/webhooks/lunaz/<seller-slug>`. It reads the raw body and checks `X-Lunaz-Signature: t=<unix seconds>,v1=<hex>`: `v1` must equal HMAC-SHA256 of `"{t}.{raw body}"` keyed with that seller's `webhookSecret` (constant-time compare) and `t` must be within 5 minutes of now. Only then is the JSON parsed.

- Missing, malformed, stale or wrong signature: logged with `signature_valid=0` (reason on the console), answer 401. Missing secret for the seller: 500.
- `X-Lunaz-Event-Id` must match the body's `id` (else 400). An event id that was already accepted is logged again and answered 200 `{"ok":true,"duplicate":true}` without touching the order.
- `invoice.paid` and `invoice.underpaid` update the order by `invoice_id` (a paid order is never downgraded). `swap.*` and `test` events are only logged. Unknown invoices are logged and answered 200.

Configure each seller in the Lunaz dashboard (Settings, Webhooks): set the URL above for that seller's slug, copy the signing secret into that seller's `webhookSecret` in `LUNAZ_SELLERS`, restart, then press "Send test". The URL must be reachable from core-service (locally `http://127.0.0.1:3000/api/webhooks/lunaz/<slug>`; the dev server binds 127.0.0.1).

In Docker the database lives in the `/data` volume: `-v lunaz-demo-data:/data` with `--read-only` (the root filesystem stays read-only).

## Environment

| Variable | Where | Description |
| --- | --- | --- |
| `LUNAZ_SELLERS` | server, runtime, secret | JSON array `[{"slug":"kedai-kopi-senja","apiKey":"lz_...","webhookSecret":"..."}, ...]`, one merchant key and webhook secret per shop |
| `DEMO_DB` | server, runtime | SQLite file for orders and webhook events (default `./data/demo.db`, `/data/demo.db` in Docker) |
| `LUNAZ_API_KEY` | server, runtime, secret | fallback: if `LUNAZ_SELLERS` is unset, every shop uses this key (a warning is logged once) |
| `LUNAZ_API_URL` | server, runtime | core-service base URL (default `http://127.0.0.1:8099`) |
| `VITE_LUNAZ_SITE_URL` | public, build time | Lunaz website behind the "Payments by Lunaz" badge (default `https://lunaz.example.com`) |
| `VITE_LUNAZ_WS_URL` | public, build time | WebSocket base URL the browser connects to (default `ws://127.0.0.1:8099`) |
| `VITE_TESTNET` | public, build time | `1` shows the testnet banner and disables "Other crypto" (cross-chain is mainnet only); empty for mainnet |
| `VITE_MAINNET_URL` | public, build time | Mainnet site linked from the testnet banner (default `https://lunaz.alwaysbedream.dev`) |

`VITE_LUNAZ_WS_URL` must also be set at runtime (the Dockerfile does this): `server.mjs` derives the CSP `connect-src` WebSocket origin from it.

`VITE_*` values are baked into the client bundle at build time and are public. Use `wss://` when the page is served over HTTPS.

## Security headers and CSP

`server.mjs` adds `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `Permissions-Policy` to every response, including the webhook receiver (harmless for server-to-server calls). Set `HSTS=1` to add `Strict-Transport-Security`; setting it at the TLS proxy is better.

The CSP allows `'self'`, the `VITE_LUNAZ_WS_URL` origin for `connect-src`, `data:`/`blob:` images (QR codes) and Google Fonts. `script-src` and `style-src` keep `'unsafe-inline'` because TanStack Start injects inline hydration scripts. To allow another origin, add it to the `csp` array at the top of `server.mjs`, rebuild and check the browser console for violations.

Caching: `/checkout/*`, `/orders/*`, `/_serverFn/*` and `/api/*` send `Cache-Control: no-store`; hashed `/assets/*` are `public, max-age=31536000, immutable`. Malformed responses from core-service become a generic error, and the "Open in wallet" link only renders for `zcash:` URIs.

## Local development

```bash
cp .env.example .env   # set LUNAZ_SELLERS (or LUNAZ_API_KEY for one merchant)
bun install
bun run dev            # http://localhost:3000
bun run check          # biome
```

## Production build and Docker

`bun run build` writes `dist/client` (static assets) and `dist/server/server.js` (a fetch handler). `server.mjs` serves both with [srvx](https://srvx.h3.dev) on `HOST:PORT` (default `0.0.0.0:3000`). It runs on Node 22.

The final image stage is `distroless/nodejs22-debian12:nonroot`: no shell, non-root. `.env*` files are excluded by `.dockerignore`, so API keys are never baked in. Pass it at runtime only. A `HEALTHCHECK` requests `/`.

```bash
docker build --build-arg VITE_LUNAZ_WS_URL=wss://api.example.com -t lunaz-demo .

docker run -d --name lunaz-demo --read-only --tmpfs /tmp --cap-drop ALL \
  --security-opt no-new-privileges:true --pids-limit 256 --memory 512m \
  -p 127.0.0.1:3000:3000 -e LUNAZ_API_URL=http://core:8080 \
  -e LUNAZ_SELLERS="$LUNAZ_SELLERS" -v lunaz-demo-data:/data \
  --restart unless-stopped lunaz-demo
```

Compose:

```yaml
services:
  demo:
    build:
      context: .
      args:
        VITE_LUNAZ_WS_URL: wss://api.example.com
    read_only: true
    tmpfs: [/tmp]
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    pids_limit: 256
    mem_limit: 512m
    ports: ["127.0.0.1:3000:3000"]
    environment:
      LUNAZ_API_URL: http://core:8080
      LUNAZ_SELLERS: ${LUNAZ_SELLERS}
    volumes: ["demo-data:/data"]
    restart: unless-stopped
volumes:
  demo-data:
```

## Deploy notes

- Terminate TLS in a reverse proxy and publish the container on `127.0.0.1` only.
- The browser must reach core-service WebSocket at `VITE_LUNAZ_WS_URL`, so expose it publicly (as `wss://`). `LUNAZ_API_URL` can stay internal.
- Changing `VITE_TESTNET` or `VITE_MAINNET_URL` also requires a rebuild.
- Changing `VITE_LUNAZ_WS_URL` requires a rebuild.
- Anyone can place an order, which creates an invoice with that shop's key. Rate-limit `POST` requests to the server functions at the proxy if needed.
