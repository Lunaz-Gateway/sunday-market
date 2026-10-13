import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { decodeLines, SHOPS, shopOf, totalOf } from "./catalog";

export type Invoice = {
	id: string;
	address: string;
	amount_zat: number;
	zip321_uri: string;
	status: string;
	expires_at: number;
};

const apiBase = () => process.env.LUNAZ_API_URL ?? "http://127.0.0.1:8099";

type Seller = { slug: string; apiKey: string };
let sellers: Seller[] | undefined;

// LUNAZ_SELLERS = [{"slug","apiKey"}]; falls back to LUNAZ_API_KEY for every shop.
function sellerList(): Seller[] {
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
	return (await res.json()) as Invoice;
}

// Marketplace: one invoice per shop, priced on the server from the catalog.
export const createOrder = createServerFn({ method: "POST" })
	.inputValidator((d: { seller: string; lines: string }) => d)
	.handler(async ({ data }): Promise<Invoice> => {
		if (!shopOf(data.seller)) badRequest("Unknown shop");
		const lines = decodeLines(data.lines);
		if (!lines.length || lines.some((l) => l.shop !== data.seller)) {
			badRequest("Invalid order");
		}
		return postInvoice(data.seller, totalOf(lines));
	});

// Server-side only: the REST endpoint has no CORS headers.
export const getInvoice = createServerFn({ method: "GET" })
	.inputValidator((d: { id: string }) => d)
	.handler(async ({ data }) => {
		const res = await fetch(
			`${apiBase()}/v1/invoices/${encodeURIComponent(data.id)}`,
		);
		if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
		return (await res.json()) as {
			status: string;
			txid: string | null;
			received_zat: number;
			overpaid_zat?: number;
		};
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
		return res.json();
	});

export const getSwapAssets = createServerFn({ method: "GET" }).handler(
	async (): Promise<SwapAsset[]> => {
		const res = await fetch(`${apiBase()}/v1/swap/assets`);
		if (!res.ok) throw new Error(`Could not load assets (${res.status})`);
		return res.json();
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
		if (res.status === 429) {
			throw new Error(body.error ?? "Too many attempts, try again later");
		}
		if (!res.ok) throw new Error(body.error ?? `Swap failed (${res.status})`);
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
