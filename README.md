# Lunaz demo app

Reference clients for the Lunaz Zcash payment gateway. Built with TanStack Start (React 19), Vite 8, Tailwind 4 and Biome. The package manager is bun.

## Pages

- `/` is a cashier tablet. The merchant enters an amount and creates an invoice.
- `/store` is a demo store that creates an invoice at checkout.
- `/checkout/$invoiceId` is a hosted checkout. It shows a Zcash QR code and address, live status over WebSocket, and cross-chain payment via NEAR Intents (pay with another asset, swapped to ZEC).

## API key stays on the server

Invoice calls (`src/lib/invoice.ts`) are TanStack server functions. They run on the server and send `Authorization: Bearer $LUNAZ_API_KEY` to core-service. The key is never sent to the browser. The browser only receives the invoice, and opens a WebSocket to core-service for live status (`/v1/invoices/:id/ws`, no key needed).

## Environment

| Variable | Where | Description |
| --- | --- | --- |
| `LUNAZ_API_KEY` | server, runtime, secret | merchant API key |
| `LUNAZ_API_URL` | server, runtime | core-service base URL (default `http://127.0.0.1:8099`) |
| `VITE_LUNAZ_WS_URL` | public, build time | WebSocket base URL the browser connects to (default `ws://127.0.0.1:8099`) |

`VITE_*` values are baked into the client bundle at build time and are public. Use `wss://` when the page is served over HTTPS.

## Local development

```bash
cp .env.example .env   # set LUNAZ_API_KEY
bun install
bun run dev            # http://localhost:3000
bun run check          # biome
```

## Production build and Docker

`bun run build` writes `dist/client` (static assets) and `dist/server/server.js` (a fetch handler). `server.mjs` serves both with [srvx](https://srvx.h3.dev) on `HOST:PORT` (default `0.0.0.0:3000`). It runs on Node 22.

The final image stage is `distroless/nodejs22-debian12:nonroot`: no shell, non-root. `.env*` files are excluded by `.dockerignore`, so the API key is never baked in. Pass it at runtime only. A `HEALTHCHECK` requests `/`.

```bash
docker build --build-arg VITE_LUNAZ_WS_URL=wss://api.example.com -t lunaz-demo .

docker run -d --name lunaz-demo --read-only --tmpfs /tmp --cap-drop ALL \
  --security-opt no-new-privileges:true --pids-limit 256 --memory 512m \
  -p 127.0.0.1:3000:3000 -e LUNAZ_API_URL=http://core:8080 \
  -e LUNAZ_API_KEY="$LUNAZ_API_KEY" \
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
      LUNAZ_API_KEY: ${LUNAZ_API_KEY}
    restart: unless-stopped
```

## Deploy notes

- Terminate TLS in a reverse proxy and publish the container on `127.0.0.1` only.
- The browser must reach core-service WebSocket at `VITE_LUNAZ_WS_URL`, so expose it publicly (as `wss://`). `LUNAZ_API_URL` can stay internal.
- Changing `VITE_LUNAZ_WS_URL` requires a rebuild.
- Anyone who can open the cashier page can create invoices with your key. Restrict access to `/` at the proxy.
