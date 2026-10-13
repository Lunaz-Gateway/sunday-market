// Production entry: serves dist/client statically, everything else via the SSR fetch handler.
// Every response (pages, assets, server functions, errors) gets the security headers below.
import { serve } from "srvx";
import { serveStatic } from "srvx/static";
import app from "./dist/server/server.js";

// WebSocket origin for live invoice status, derived from the same env the client was built with.
// 'unsafe-inline' stays for scripts: TanStack Start injects inline hydration scripts and
// the router has no per-request nonce hook yet. Extend an origin list here, see README.
const wsOrigin = (() => {
	try {
		return new URL(process.env.VITE_LUNAZ_WS_URL ?? "ws://127.0.0.1:8099").origin;
	} catch {
		return "";
	}
})();

const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	`connect-src 'self' ${wsOrigin}`.trim(),
	"img-src 'self' data: blob:",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' https://fonts.gstatic.com",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"object-src 'none'",
	"form-action 'self'",
].join("; ");

const security = {
	"content-security-policy": csp,
	"x-frame-options": "DENY",
	"x-content-type-options": "nosniff",
	"referrer-policy": "strict-origin-when-cross-origin",
	"permissions-policy":
		"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
	// Prefer setting HSTS at the TLS proxy; HSTS=1 is for when this server is the edge
	...(process.env.HSTS === "1" && {
		"strict-transport-security": "max-age=31536000; includeSubDomains",
	}),
};

function cacheControl(path, status) {
	if (
		["/checkout", "/orders", "/_serverFn", "/api"].some(
			(p) => path === p || path.startsWith(`${p}/`),
		)
	)
		return "no-store";
	// A missing asset (e.g. mid-deploy) must never be cached by a CDN
	if (path.startsWith("/assets/"))
		return status === 200 ? "public, max-age=31536000, immutable" : "no-store";
}

async function secure(req, next) {
	let res;
	try {
		res = await next();
	} catch (e) {
		console.error(e);
		res = new Response("Internal Server Error", { status: 500 });
	}
	// Headers can be immutable (redirects, proxied responses): rebuild when so
	const cc = cacheControl(new URL(req.url).pathname, res.status);
	const apply = (r) => {
		for (const [k, v] of Object.entries(security)) r.headers.set(k, v);
		if (cc) r.headers.set("cache-control", cc);
		return r;
	};
	try {
		return apply(res);
	} catch {
		return apply(new Response(res.body, res));
	}
}

serve({
	fetch: app.fetch,
	hostname: process.env.HOST ?? "0.0.0.0",
	port: Number(process.env.PORT ?? 3000),
	middleware: [secure, serveStatic({ dir: "./dist/client" })],
});
