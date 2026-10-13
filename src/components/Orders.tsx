import { useEffect, useState } from "react";
import { shopOf } from "#/lib/catalog";
import type { OrderView } from "#/lib/invoice";

const TONE: Record<OrderView["status"], string> = {
	pending: "bg-stone-100 text-stone-700",
	detected: "bg-amber-100 text-amber-900",
	paid: "bg-pasar-soft text-pasar",
	underpaid: "bg-red-50 text-red-700",
	expired: "bg-stone-100 text-stone-500",
};

export function StatusBadge({ status }: { status: OrderView["status"] }) {
	return (
		<span
			className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${TONE[status]}`}
		>
			{status}
		</span>
	);
}

export const shopName = (slug: string) => shopOf(slug)?.name ?? slug;

export const itemsOf = (o: OrderView) =>
	o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ");

export const when = (secs: number) =>
	new Date(secs * 1000).toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	});

// Reads from the DB; refreshes every 5 s while an order is still open.
export function usePolled<T>(
	load: () => Promise<T>,
	open: (v: T) => boolean,
	key: string,
) {
	const [value, setValue] = useState<T | undefined>();
	const [failed, setFailed] = useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: key is the only trigger
	useEffect(() => {
		let stop = false;
		let timer: ReturnType<typeof setTimeout>;
		const tick = async () => {
			try {
				const v = await load();
				if (stop) return;
				setValue(v);
				setFailed(false);
				if (open(v)) timer = setTimeout(tick, 5000);
			} catch {
				if (stop) return;
				setFailed(true);
				timer = setTimeout(tick, 5000);
			}
		};
		tick();
		return () => {
			stop = true;
			clearTimeout(timer);
		};
	}, [key]);
	return { value, failed };
}

export const isOpen = (o: OrderView) =>
	o.status === "pending" || o.status === "detected";
