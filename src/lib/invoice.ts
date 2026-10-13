import { randomInt } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { decodeLines, SHOPS, shopOf, totalOf } from "./catalog";
import { nowSecs, type OrderRow, store } from "./db";

export type Invoice = {
	id: string;
	address: string;
	amount_zat: number;
	zip321_uri: string;
	status: string;
	expires_at: number;
};

// Upstream bodies are never echoed: a malformed one becomes a generic error
const parse = async <T>(res: Response): Promise<T> => {
	try {
		return (await res.json()) as T;
	} catch {
		throw new Error("Unexpected response from the payment server.");
	}
};

const apiBase = () => process.env.LUNAZ_API_URL ?? "http://127.0.0.1:8099";

type Seller = { slug: string; apiKey: string; webhookSecret?: string };
let sellers: Seller[] | undefined;

// LUNAZ_SELLERS = [{"slug","apiKey","webhookSecret"?}]; falls back to LUNAZ_API_KEY for every shop.
export function sellerList(): Seller[] {
	if (sellers) return sellers;
	const raw = process.env.LUNAZ_SELLERS;
	if (raw) {
		const list = JSON.parse(raw) as Seller[];
		sellers = list.filter((s) => s?.slug && s.apiKey);
	} else {
		const key = process.env.LUNAZ_API_KEY ?? "";
		console.warn(
			"LUNAZ_SELLERS is not set: every shop uses LUNAZ_API_KEY (single merchant).",
		);
		sellers = SHOPS.map((s) => ({ slug: s.slug, apiKey: key }));
	}
	return sellers;
}

function badRequest(msg: string): never {
	setResponseStatus(400);
	throw new Error(msg);
}

async function postInvoice(seller: string, amountZat: number) {
	const key = sellerList().find((s) => s.slug === seller)?.apiKey;
	if (!key) {
		throw new Error("This shop has no merchant key configured.");
	}
	const res = await fetch(`${apiBase()}/v1/invoices`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${key}`,
		},
		body: JSON.stringify({ amount_zat: amountZat }),
		signal: AbortSignal.timeout(10_000),
	}).catch(() => {
		throw new Error(
			"Can't reach the payment server. Check the connection and try again.",
		);
	});
	if (res.status === 401 || res.status === 403) {
		throw new Error(
			"The merchant key was rejected. Ask the store owner to update it.",
		);
	}
	if (!res.ok) {
		throw new Error(
			`The payment server couldn't create the invoice (${res.status}). Try again.`,
		);
	}
	return parse<Invoice>(res);
}

const ORDER_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const orderNumber = () =>
	`SM-${Array.from({ length: 6 }, () => ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)]).join("")}`;

// Marketplace: one invoice per shop, priced on the server from the catalog.
export const createOrder = createServerFn({ method: "POST" })
	.inputValidator((d: { seller: string; lines: string; email?: string }) => d)
	.handler(async ({ data }): Promise<Invoice & { orderId: string }> => {
		if (!shopOf(data.seller)) badRequest("Unknown shop");
		const lines = decodeLines(data.lines);
		if (!lines.length || lines.some((l) => l.shop !== data.seller)) {
			badRequest("Invalid order");
		}
		const inv = await postInvoice(data.seller, totalOf(lines));
		const orderId = orderNumber();
		const t = nowSecs();
		store()
			.prepare(
				"INSERT INTO orders(id,seller,invoice_id,lines,amount_zat,status,contact_email,created_at,updated_at) VALUES(?,?,?,?,?,'pending',?,?,?)",
			)
			.run(
				orderId,
				data.seller,
				inv.id,
				JSON.stringify(
					lines.map((l) => ({
						id: l.id,
						name: l.name,
						qty: l.qty,
						zat: l.zat,
					})),
				),
				inv.amount_zat,
				data.email?.trim().slice(0, 200) || null,
				t,
				t,
			);
		return { ...inv, orderId };
	});

export type OrderView = {
	id: string;
	seller: string;
	invoiceId: string;
	lines: { id: string; name: string; qty: number; zat: number }[];
	amountZat: number;
	status: OrderRow["status"];
	receivedZat: number;
	txid: string | null;
	createdAt: number;
	paidAt: number | null;
};

const view = (r: OrderRow): OrderView => ({
	id: r.id,
	seller: r.seller,
	invoiceId: r.invoice_id,
	lines: JSON.parse(r.lines),
	amountZat: r.amount_zat,
	status: r.status,
	receivedZat: r.received_zat,
	txid: r.txid,
	createdAt: r.created_at,
	paidAt: r.paid_at,
});

// Only the ids the browser asks for; there is no listing of other buyers' orders.
export const listOrders = createServerFn({ method: "GET" })
	.inputValidator((d: { ids: string[] }) => d)
	.handler(async ({ data }): Promise<OrderView[]> => {
		const ids = data.ids.slice(0, 50);
		if (!ids.length) return [];
		const rows = store()
			.prepare(
				`SELECT * FROM orders WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY created_at DESC`,
			)
			.all(...ids) as OrderRow[];
		return rows.map(view);
	});

export const getOrderById = createServerFn({ method: "GET" })
	.inputValidator((d: { id: string }) => d)
	.handler(async ({ data }): Promise<OrderView | null> => {
		const r = store().prepare("SELECT * FROM orders WHERE id=?").get(data.id) as
			| OrderRow
			| undefined;
		return r ? view(r) : null;
	});

// Server-side only: the REST endpoint has no CORS headers.
export const getInvoice = createServerFn({ method: "GET" })
	.inputValidator((d: { id: string }) => d)
	.handler(async ({ data }) => {
		const res = await fetch(
			`${apiBase()}/v1/invoices/${encodeURIComponent(data.id)}`,
		);
		if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
		return parse<{
			status: string;
			txid: string | null;
			received_zat: number;
			overpaid_zat?: number;
		}>(res);
	});

export type SwapInfo = {
	status?: string;
	symbol: string;
	blockchain: string;
	deposit_address: string;
	amount_in_formatted: string;
	deadline: number | string;
	deposit_memo?: string | null;
	amount_in_usd?: number | string | null;
	time_estimate?: number;
};

export type InvoiceDetail = {
	id: string;
	status: string;
	amount_zat: number;
	expires_at: number;
	txid: string | null;
	address?: string;
	zip321_uri?: string;
	swap: SwapInfo | null;
};

export type SwapAsset = {
	asset_id: string;
	symbol: string;
	blockchain: string;
	decimals: number;
	price_usd: number | null;
};

// Public checkout loader: null means 404.
export const loadInvoice = createServerFn({ method: "GET" })
	.inputValidator((d: { id: string }) => d)
	.handler(async ({ data }): Promise<InvoiceDetail | null> => {
		const res = await fetch(
			`${apiBase()}/v1/invoices/${encodeURIComponent(data.id)}`,
		);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
		return parse<InvoiceDetail>(res);
	});

export const getSwapAssets = createServerFn({ method: "GET" }).handler(
	async (): Promise<SwapAsset[]> => {
		const res = await fetch(`${apiBase()}/v1/swap/assets`);
		if (!res.ok) throw new Error(`Could not load assets (${res.status})`);
		return parse<SwapAsset[]>(res);
	},
);

export const createSwap = createServerFn({ method: "POST" })
	.inputValidator((d: { id: string; assetId: string; refundTo: string }) => d)
	.handler(async ({ data }): Promise<SwapInfo> => {
		const res = await fetch(
			`${apiBase()}/v1/invoices/${encodeURIComponent(data.id)}/swap`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					asset_id: data.assetId,
					refund_to: data.refundTo,
				}),
			},
		);
		const body = await res.json().catch(() => ({}));
		const msg = typeof body.error === "string" ? body.error : "";
		if (res.status === 429) {
			throw new Error(msg || "Too many attempts, try again later");
		}
		if (!res.ok) throw new Error(msg || `Swap failed (${res.status})`);
		return {
			symbol: body.symbol,
			blockchain: body.blockchain,
			deposit_address: body.deposit_address,
			deposit_memo: body.deposit_memo,
			amount_in_formatted: body.amount_in_formatted,
			amount_in_usd: body.amount_in_usd,
			deadline: body.deadline,
			time_estimate: body.time_estimate,
		};
	});
