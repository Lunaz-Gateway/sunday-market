import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketShell, mbtn } from "#/components/Market";
import {
	isOpen,
	StatusBadge,
	shopName,
	usePolled,
	when,
} from "#/components/Orders";
import { encodeLines, MARKET } from "#/lib/catalog";
import { short, zec } from "#/lib/format";
import { getOrderById } from "#/lib/invoice";

export const Route = createFileRoute("/orders/$orderId")({
	head: () => ({ meta: [{ title: `Order · ${MARKET}` }] }),
	component: OrderPage,
});

function OrderPage() {
	const { orderId } = Route.useParams();
	const { value } = usePolled(
		() => getOrderById({ data: { id: orderId } }),
		(o) => !!o && isOpen(o),
		orderId,
	);
	return (
		<MarketShell>
			<div className="rise mx-auto flex w-full max-w-xl flex-col gap-4">
				<Link to="/orders" className="text-sm font-semibold text-pasar">
					‹ Your orders
				</Link>
				{value === undefined ? (
					<span className="skeleton block h-64 rounded-3xl" />
				) : value === null ? (
					<p className="rounded-3xl bg-white p-8 text-center text-stone-600 ring-1 ring-stone-200">
						Order not found.
					</p>
				) : (
					<section className="flex flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-stone-200 sm:p-8">
						<div className="flex items-center justify-between gap-3">
							<h1 className="font-mono text-2xl font-extrabold">#{value.id}</h1>
							<StatusBadge status={value.status} />
						</div>
						<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
							<dt className="text-stone-500">Shop</dt>
							<dd className="text-right font-semibold">
								{shopName(value.seller)}
							</dd>
							<dt className="text-stone-500">Placed</dt>
							<dd className="text-right">{when(value.createdAt)}</dd>
							<dt className="text-stone-500">Total</dt>
							<dd className="text-right font-semibold tnum">
								{zec(value.amountZat)}
							</dd>
							{value.status === "paid" && value.paidAt && (
								<>
									<dt className="text-stone-500">Paid</dt>
									<dd className="text-right text-pasar">
										Confirmed by the shop's webhook · {when(value.paidAt)}
									</dd>
								</>
							)}
							{value.txid && (
								<>
									<dt className="text-stone-500">Transaction</dt>
									<dd className="text-right font-mono">
										{short(value.txid, 6)}
									</dd>
								</>
							)}
						</dl>
						<ul className="flex flex-col gap-2 border-t border-stone-100 pt-4 text-sm">
							{value.lines.map((l) => (
								<li key={l.id} className="flex justify-between gap-3">
									<span className="min-w-0 truncate">
										{l.qty} × {l.name}
									</span>
									<span className="tnum">{zec(l.zat * l.qty)}</span>
								</li>
							))}
						</ul>
						{isOpen(value) && (
							<Link
								to="/checkout/$invoiceId"
								params={{ invoiceId: value.invoiceId }}
								search={{
									z: undefined,
									m: undefined,
									s: value.seller,
									o: encodeLines(
										Object.fromEntries(value.lines.map((l) => [l.id, l.qty])),
									),
								}}
								className={`${mbtn.primary} min-h-14`}
							>
								Open payment page
							</Link>
						)}
					</section>
				)}
			</div>
		</MarketShell>
	);
}
