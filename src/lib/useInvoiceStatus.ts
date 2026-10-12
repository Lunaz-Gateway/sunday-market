import { useEffect, useState } from "react";

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
				final = m.status === "paid" || m.status === "expired";
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
	return state;
}
