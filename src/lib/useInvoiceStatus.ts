import { useEffect, useState } from "react";
import { getInvoice } from "./invoice";

const WS_URL = import.meta.env.VITE_LUNAZ_WS_URL ?? "ws://127.0.0.1:8099";

export function useInvoiceStatus(id: string, initial = "pending") {
	const [state, setState] = useState<{ status: string; swap?: string }>({
		status: initial,
	});
	useEffect(() => {
		let ws: WebSocket | undefined;
		let timer: ReturnType<typeof setTimeout>;
		let final = false;
		const connect = () => {
			ws = new WebSocket(`${WS_URL}/v1/invoices/${id}/ws`);
			ws.onmessage = (e) => {
				const m = JSON.parse(e.data);
				setState({ status: m.status, swap: m.swap_status ?? undefined });
				final = ["paid", "underpaid", "expired"].includes(m.status);
			};
			// The first message after a reconnect re-syncs state.
			ws.onclose = () => {
				if (!final) timer = setTimeout(connect, 1500);
			};
		};
		connect();
		return () => {
			final = true;
			clearTimeout(timer);
			ws?.close();
		};
	}, [id]);
	// Amounts come from REST: refetch on status change, poll while detected.
	const [amounts, setAmounts] = useState({ received: 0, overpaid: 0 });
	const { status } = state;
	useEffect(() => {
		if (status === "pending" || status === "expired") return;
		const load = () =>
			getInvoice({ data: { id } })
				.then((i) =>
					setAmounts({
						received: i.received_zat ?? 0,
						overpaid: i.overpaid_zat ?? 0,
					}),
				)
				.catch(() => {});
		load();
		if (status !== "detected") return;
		const t = setInterval(load, 10_000);
		return () => clearInterval(t);
	}, [id, status]);
	return { ...state, ...amounts };
}
