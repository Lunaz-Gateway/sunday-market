import { createServerFn } from "@tanstack/react-start";

export type Invoice = {
	id: string;
	address: string;
	amount_zat: number;
	zip321_uri: string;
	status: string;
	expires_at: number;
};

export const createInvoice = createServerFn({ method: "POST" })
	.inputValidator((d: { amountZat: number }) => {
		if (!Number.isSafeInteger(d.amountZat) || d.amountZat <= 0) {
			throw new Error("Invalid amount");
		}
		return d;
	})
	.handler(async ({ data }): Promise<Invoice> => {
		const base = process.env.LUNAZ_API_URL ?? "http://127.0.0.1:8099";
		if (!process.env.LUNAZ_API_KEY) {
			throw new Error("This terminal has no merchant key configured.");
		}
		const res = await fetch(`${base}/v1/invoices`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${process.env.LUNAZ_API_KEY}`,
			},
			body: JSON.stringify({ amount_zat: data.amountZat }),
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
		return res.json();
	});

// Server-side only: the REST endpoint has no CORS headers.
export const getInvoice = createServerFn({ method: "GET" })
	.inputValidator((d: { id: string }) => d)
	.handler(async ({ data }) => {
		const base = process.env.LUNAZ_API_URL ?? "http://127.0.0.1:8099";
		const res = await fetch(
			`${base}/v1/invoices/${encodeURIComponent(data.id)}`,
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

const apiBase = () => process.env.LUNAZ_API_URL ?? "http://127.0.0.1:8099";

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
