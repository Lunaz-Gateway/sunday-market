import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ErrorNote,
	MarketShell,
	mbtn,
	Price,
	ShopAvatar,
	Spinner,
	Stepper,
	useCheckout,
} from "#/components/Market";
import { ProductArt } from "#/components/ProductArt";
import { Icon } from "#/components/ui";
import { type Cart, countOf, setQty, useCart } from "#/lib/cart";
import {
	type Line,
	MARKET,
	MIN_SWAP_ZAT,
	productsOf,
	SHOPS,
	type Shop,
	totalOf,
} from "#/lib/catalog";
import { zec } from "#/lib/format";
import { useZecUsd } from "#/lib/price";

export const Route = createFileRoute("/cart")({
	head: () => ({ meta: [{ title: `Cart · ${MARKET}` }] }),
	component: CartPage,
});

function CartPage() {
	const cart = useCart();
	const usd = useZecUsd();
	const groups = SHOPS.map((shop) => ({
		shop,
		lines: productsOf(shop.slug)
			.filter((p) => cart[p.id])
			.map((p) => ({ ...p, qty: cart[p.id] })),
	})).filter((g) => g.lines.length);
	const n = countOf(cart);

	return (
		<MarketShell cartBar={false}>
			<h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
				Your cart
			</h1>
			{groups.length > 1 && (
				<p className="mt-1 text-stone-500">
					{n} items from {groups.length} shops. Each shop is paid separately,
					straight to its own wallet.
				</p>
			)}
			{groups.length === 0 ? (
				<div className="rise mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-stone-200">
					<span className="grid h-14 w-14 place-items-center rounded-full bg-stone-100">
						<Icon name="cart" className="h-7 w-7 text-stone-500" />
					</span>
					<p className="text-lg font-bold">Your cart is empty</p>
					<p className="max-w-sm text-stone-500">
						Find something you like from the shops on {MARKET}.
					</p>
					<Link to="/" className={`${mbtn.primary} mt-2`}>
						Start shopping
					</Link>
				</div>
			) : (
				<div className="mt-6 flex flex-col gap-5">
					{groups.map((g) => (
						<ShopGroup key={g.shop.slug} {...g} usd={usd} />
					))}
				</div>
			)}
		</MarketShell>
	);
}

function ShopGroup({
	shop,
	lines,
	usd,
}: {
	shop: Shop;
	lines: Line[];
	usd: number | null;
}) {
	const { go, busy, error } = useCheckout();
	const total = totalOf(lines);
	const qty: Cart = Object.fromEntries(lines.map((l) => [l.id, l.qty]));
	return (
		<section
			aria-label={shop.name}
			className="rise overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200"
		>
			<Link
				to="/shop/$slug"
				params={{ slug: shop.slug }}
				className="flex items-center gap-3 border-b border-stone-100 px-4 py-3 hover:bg-stone-50 sm:px-5"
			>
				<ShopAvatar shop={shop} className="h-9 w-9 rounded-xl" />
				<span className="min-w-0 flex-1">
					<span className="block font-bold">{shop.name}</span>
					<span className="block text-xs text-stone-500">{shop.city}</span>
				</span>
				<Icon name="back" className="h-4 w-4 rotate-180 text-stone-400" />
			</Link>
			<ul className="divide-y divide-stone-100">
				{lines.map((l) => (
					<li
						key={l.id}
						className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3 px-4 py-4 sm:grid-cols-[auto_1fr_auto_7rem] sm:px-5"
					>
						<Link
							to="/product/$id"
							params={{ id: l.id }}
							style={{ background: l.tint }}
							className="grid h-16 w-16 place-items-center rounded-xl"
							aria-label={l.name}
						>
							<ProductArt art={l.art} accent={l.accent} className="h-14 w-14" />
						</Link>
						<div className="min-w-0">
							<Link
								to="/product/$id"
								params={{ id: l.id }}
								className="block truncate font-semibold hover:text-pasar"
							>
								{l.name}
							</Link>
							<p className="truncate text-sm text-stone-500">{l.note}</p>
						</div>
						<div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1">
							<Stepper
								name={l.name}
								n={l.qty}
								onChange={(n) => setQty(l.id, n)}
							/>
							<span className="font-semibold tnum sm:hidden">
								{zec(l.zat * l.qty)}
							</span>
						</div>
						<span className="hidden text-right font-semibold tnum sm:block">
							{zec(l.zat * l.qty)}
						</span>
					</li>
				))}
			</ul>
			<div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
				<div className="flex flex-col gap-1">
					<span className="text-sm text-stone-500">Subtotal</span>
					<Price zat={total} usd={usd} />
					{total < MIN_SWAP_ZAT && (
						<span className="text-xs text-stone-500">
							Pay in ZEC, or add {zec(MIN_SWAP_ZAT - total)} more to pay with
							USDC, SOL, BTC or ETH.
						</span>
					)}
				</div>
				<div className="flex flex-col gap-2 sm:min-w-72">
					<ErrorNote text={error} />
					<button
						type="button"
						disabled={busy}
						onClick={() => go(shop.slug, qty)}
						className={`${mbtn.primary} min-h-14 w-full whitespace-nowrap`}
					>
						{busy ? (
							<>
								<Spinner />
								Preparing checkout…
							</>
						) : (
							<>
								<Icon name="lock" className="h-5 w-5" />
								Checkout with {shop.name}
							</>
						)}
					</button>
				</div>
			</div>
		</section>
	);
}
