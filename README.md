# Lunaz demo app

Reference clients for the Lunaz Zcash payment gateway. Built with TanStack Start (React 19), Vite 8, Tailwind 4 and Biome. The package manager is bun.

## Pages

Pasar Kita is a small multi-seller marketplace. Each shop is a separate Lunaz merchant with its own account, viewing key, wallet and API key. One gateway serves many merchants: an order from a shop creates an invoice with that shop's key, so the payment goes privately to that seller's wallet.

- `/` is the marketplace home: search, category chips, featured shops and all products. Search and category are kept in the URL (`?q=`, `?c=`).
- `/shop/$slug` is a shop page. `/product/$id` is a product page with "Add to cart" and "Buy now".
- `/cart` groups the cart by shop. Each shop has its own checkout button and its own invoice. The cart is kept in `localStorage`. Paid lines are removed when the checkout shows LUNAS.
- `/checkout/$invoiceId` is a hosted checkout. It shows the seller, the order lines, a Zcash QR code and address, live status over WebSocket, and cross-chain payment via NEAR Intents (pay with another asset, swapped to ZEC, from 0.001 ZEC per invoice).
- `/pos` (the old cashier) and `/store` redirect to `/`.

Shops and products are defined in `src/lib/catalog.ts`. Prices are computed on the server from the catalog, so the browser can't change them.

## API key stays on the server

Invoice calls (`src/lib/invoice.ts`) are TanStack server functions. They run on the server, look up the shop's key by its slug, and send `Authorization: Bearer <key>` to core-service. An unknown shop gets a 400. The key is never sent to the browser. The browser only receives the invoice, and opens a WebSocket to core-service for live status (`/v1/invoices/:id/ws`, no key needed).

## Environment

| Variable | Where | Description |
| --- | --- | --- |
| `LUNAZ_SELLERS` | server, runtime, secret | JSON array `[{"slug":"kedai-kopi-senja","apiKey":"lz_..."}, ...]`, one merchant key per shop |
| `LUNAZ_API_KEY` | server, runtime, secret | fallback: if `LUNAZ_SELLERS` is unset, every shop uses this key (a warning is logged once) |
| `LUNAZ_API_URL` | server, runtime | core-service base URL (default `http://127.0.0.1:8099`) |
| `VITE_LUNAZ_WS_URL` | public, build time | WebSocket base URL the browser connects to (default `ws://127.0.0.1:8099`) |

`VITE_*` values are baked into the client bundle at build time and are public. Use `wss://` when the page is served over HTTPS.

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
  -e LUNAZ_SELLERS="$LUNAZ_SELLERS" \
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
    restart: unless-stopped
```

## Deploy notes

- Terminate TLS in a reverse proxy and publish the container on `127.0.0.1` only.
- The browser must reach core-service WebSocket at `VITE_LUNAZ_WS_URL`, so expose it publicly (as `wss://`). `LUNAZ_API_URL` can stay internal.
- Changing `VITE_LUNAZ_WS_URL` requires a rebuild.
- Anyone can place an order, which creates an invoice with that shop's key. Rate-limit `POST` requests to the server functions at the proxy if needed.
