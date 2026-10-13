import { createFileRoute } from "@tanstack/react-router";
import { nowSecs, store } from "#/lib/db";
import { sellerList } from "#/lib/invoice";
import { signatureOk } from "#/lib/webhook";

type Payload = {
	type?: string;
	invoice_id?: string | null;
	received_zat?: number;
	txid?: string | null;
};

const json = (body: unknown, status: number) => Response.json(body, { status });

function log(
	seller: string,
	valid: boolean,
	code: number,
	body: string,
	p?: Payload,
) {
	store()
		.prepare(
			"INSERT INTO webhook_events(seller,type,invoice_id,signature_valid,status_code,body,received_at) VALUES(?,?,?,?,?,?,?)",
		)
		.run(
			seller,
			p?.type ?? null,
			p?.invoice_id ?? null,
			valid ? 1 : 0,
			code,
			body.slice(0, 8192),
			nowSecs(),
		);
}

function apply(seller: string, p: Payload) {
	const status =
		p.type === "invoice.paid"
			? "paid"
			: p.type === "invoice.underpaid"
				? "underpaid"
				: null;
	if (!status || !p.invoice_id) return;
	const t = nowSecs();
	// Idempotent: a paid order is never downgraded.
	store()
		.prepare(
			`UPDATE orders SET status=?1, received_zat=?2, txid=COALESCE(?3, txid),
			 paid_at=CASE WHEN ?1='paid' THEN COALESCE(paid_at, ?4) ELSE paid_at END, updated_at=?4
			 WHERE invoice_id=?5 AND seller=?6 AND status <> 'paid'`,
		)
		.run(
			status,
			Number(p.received_zat) || 0,
			p.txid ?? null,
			t,
			p.invoice_id,
			seller,
		);
}

export const Route = createFileRoute("/api/webhooks/lunaz/$seller")({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				const raw = await request.text();
				const secret = sellerList().find(
					(s) => s.slug === params.seller,
				)?.webhookSecret;
				if (!secret) {
					console.error(`webhook secret not configured for ${params.seller}`);
					return json({ error: "webhook secret not configured" }, 500);
				}
				if (
					!signatureOk(raw, secret, request.headers.get("x-lunaz-signature"))
				) {
					log(params.seller, false, 401, raw);
					return json({ error: "invalid signature" }, 401);
				}
				let p: Payload;
				try {
					p = JSON.parse(raw);
				} catch {
					log(params.seller, true, 400, raw);
					return json({ error: "invalid json" }, 400);
				}
				log(params.seller, true, 200, raw, p);
				apply(params.seller, p);
				return json({ ok: true }, 200);
			},
		},
	},
});
