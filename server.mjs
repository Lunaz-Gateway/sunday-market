// Production entry: serves dist/client statically, everything else via the SSR fetch handler.
import { serve } from "srvx";
import { serveStatic } from "srvx/static";
import app from "./dist/server/server.js";

serve({
	fetch: app.fetch,
	hostname: process.env.HOST ?? "0.0.0.0",
	port: Number(process.env.PORT ?? 3000),
	middleware: [serveStatic({ dir: "./dist/client" })],
});
