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
		const res = await fetch(`${base}/v1/invoices`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${process.env.LUNAZ_API_KEY}`,
			},
			body: JSON.stringify({ amount_zat: data.amountZat }),
		});
		if (!res.ok) throw new Error(`Could not create invoice (${res.status})`);
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
		};
	});
