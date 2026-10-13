# syntax=docker/dockerfile:1
FROM oven/bun:1.4.2 AS base
WORKDIR /app
COPY package.json bun.lock ./

FROM base AS deps
RUN bun install --frozen-lockfile

FROM base AS prod-deps
RUN bun install --frozen-lockfile --production

FROM deps AS build
COPY . .
# VITE_LUNAZ_WS_URL is public and baked into the client bundle at build time:
# never pass secrets as build args.
ARG VITE_LUNAZ_WS_URL=ws://127.0.0.1:8099
ARG VITE_LUNAZ_SITE_URL=https://lunaz.example.com
ARG VITE_TESTNET=
ARG VITE_MAINNET_URL=https://lunaz.alwaysbedream.dev
ENV VITE_LUNAZ_WS_URL=$VITE_LUNAZ_WS_URL VITE_LUNAZ_SITE_URL=$VITE_LUNAZ_SITE_URL VITE_TESTNET=$VITE_TESTNET VITE_MAINNET_URL=$VITE_MAINNET_URL
RUN bun run build && mkdir /data

FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
# Runtime copy of the build value: server.mjs allows this origin in the CSP connect-src
ARG VITE_LUNAZ_WS_URL=ws://127.0.0.1:8099
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DEMO_DB=/data/demo.db VITE_LUNAZ_WS_URL=$VITE_LUNAZ_WS_URL
COPY --from=prod-deps --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --chown=nonroot:nonroot package.json server.mjs ./
# distroless has no shell: seed /data from a build stage so the volume is writable by nonroot
COPY --from=build --chown=nonroot:nonroot /data /data
VOLUME /data
USER nonroot
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["server.mjs"]
