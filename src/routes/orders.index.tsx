import { createFileRoute, Link } from "@tanstack/react-router";
import { readOrderIds, useHydrated } from "#/components/Checkout";
import { MarketShell, mbtn } from "#/components/Market";
import {
	isOpen,
	itemsOf,
	StatusBadge,
	shopName,
	usePolled,
	when,
} from "#/components/Orders";
import { MARKET } from "#/lib/catalog";
import { zec } from "#/lib/format";
import { listOrders } from "#/lib/invoice";

export const Route = createFileRoute("/orders/")({
	head: () => ({ meta: [{ title: `Your orders · ${MARKET}` }] }),
	component: OrdersPage,
});

function OrdersPage() {
	return (
		<MarketShell>
			<div className="rise mx-auto flex w-full max-w-3xl flex-col gap-5">
				<h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
					Your orders
				</h1>
				{useHydrated() && <List />}
			</div>
		</MarketShell>
	);
}

function List() {
	const { value, failed } = usePolled(
		() => listOrders({ data: { ids: readOrderIds() } }),
		(l) => l.some(isOpen),
		"list",
	);
	if (!value) {
		return failed ? (
			<p className="text-stone-600">Couldn't load your orders. Retrying…</p>
		) : (
			<span className="skeleton block h-40 rounded-3xl" />
		);
	}
	if (!value.length) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-stone-200">
				<p className="text-stone-600">
					No orders yet. Orders placed in this browser show up here.
				</p>
				<Link to="/" className={mbtn.primary}>
					Continue shopping
				</Link>
			</div>
		);
	}
	return (
		<ul className="flex flex-col gap-3">
			{value.map((o) => (
				<li key={o.id}>
					<Link
						to="/orders/$orderId"
						params={{ orderId: o.id }}
						className="press flex flex-col gap-2 rounded-2xl bg-white p-4 ring-1 ring-stone-200 hover:ring-pasar sm:p-5"
					>
						<span className="flex items-center justify-between gap-3">
							<span className="font-mono font-bold">#{o.id}</span>
							<StatusBadge status={o.status} />
						</span>
						<span className="text-sm text-stone-600">
							{shopName(o.seller)} · {itemsOf(o)}
						</span>
						<span className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
							<span className="font-semibold tnum">{zec(o.amountZat)}</span>
							{o.status === "paid" && o.paidAt && (
								<span className="text-pasar">
									Confirmed by the shop's webhook · {when(o.paidAt)}
								</span>
							)}
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
}
