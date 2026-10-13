import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
	add,
	ErrorNote,
	LunazBadge,
	MarketShell,
	mbtn,
	Price,
	ProductCard,
	ShopAvatar,
	Spinner,
	Stepper,
	useCheckout,
} from "#/components/Market";
import { ProductArt } from "#/components/ProductArt";
import { Icon } from "#/components/ui";
import {
	MARKET,
	MIN_SWAP_ZAT,
	type Product,
	productOf,
	productsOf,
	shopOf,
} from "#/lib/catalog";
import { zec } from "#/lib/format";
import { useZecUsd } from "#/lib/price";

export const Route = createFileRoute("/product/$id")({
	loader: ({ params }) => {
		const p = productOf(params.id);
		if (!p) throw notFound();
		return p;
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: `${(loaderData as Product | undefined)?.name} · ${MARKET}` },
		],
	}),
	// Fresh quantity per product.
	component: () => <ProductPage key={Route.useParams().id} />,
});

function ProductPage() {
	const p = Route.useLoaderData();
	// biome-ignore lint/style/noNonNullAssertion: every product has a shop
	const shop = shopOf(p.shop)!;
	const usd = useZecUsd();
	const [n, setN] = useState(1);
	const { go, busy, error } = useCheckout();
	const more = productsOf(shop.slug).filter((x) => x.id !== p.id);

	return (
		<MarketShell>
			<nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone-500">
				<Link to="/" className="hover:text-pasar">
					{MARKET}
				</Link>
				<span aria-hidden="true"> / </span>
				<Link
					to="/shop/$slug"
					params={{ slug: shop.slug }}
					className="hover:text-pasar"
				>
					{shop.name}
				</Link>
			</nav>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
				<div
					style={{ background: p.tint }}
					className="rise grid aspect-[16/10] place-items-center rounded-3xl p-6 md:aspect-square md:p-10"
				>
					<ProductArt art={p.art} accent={p.accent} className="w-full" />
				</div>
				<div className="flex min-w-0 flex-col gap-5">
					<div>
						<h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
							{p.name}
						</h1>
						<p className="mt-1 text-stone-500">{p.note}</p>
					</div>
					<Price zat={p.zat * n} usd={usd} big />
					<p className="leading-relaxed text-stone-700">{p.description}</p>
					<div className="flex flex-wrap items-center gap-3">
						<Stepper name={p.name} n={n} min={1} onChange={setN} />
						<span className="text-sm text-stone-500 tnum">
							{n > 1 && `${n} × ${zec(p.zat)}`}
						</span>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<button
							type="button"
							onClick={() => add(p, n)}
							className={`${mbtn.outline} min-h-14`}
						>
							<Icon name="cart" className="h-5 w-5" />
							Add to cart
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() => go(shop.slug, { [p.id]: n })}
							className={`${mbtn.primary} min-h-14`}
						>
							{busy ? (
								<>
									<Spinner />
									Preparing checkout…
								</>
							) : (
								"Buy now"
							)}
						</button>
					</div>
					<ErrorNote text={error} />
					<div className="flex gap-3 rounded-2xl bg-white p-4 text-sm text-stone-600 ring-1 ring-stone-200">
						<Icon name="lock" className="mt-0.5 h-5 w-5 shrink-0 text-pasar" />
						<p>
							Pay with shielded ZEC, or with USDC, SOL, BTC or ETH and it's
							swapped to ZEC for you
							{p.zat * n < MIN_SWAP_ZAT && " (orders from 0.001 ZEC)"}. The
							money goes straight to {shop.name}.
						</p>
					</div>
					<Link
						to="/shop/$slug"
						params={{ slug: shop.slug }}
						className="press flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200 hover:ring-stone-300"
					>
						<ShopAvatar shop={shop} />
						<span className="min-w-0 flex-1">
							<span className="block font-bold">{shop.name}</span>
							<span className="block truncate text-sm text-stone-500">
								{shop.city} · {shop.tagline}
							</span>
						</span>
						<span className="hidden sm:block">
							<LunazBadge label="Paid via" />
						</span>
						<Icon name="back" className="h-5 w-5 rotate-180 text-stone-400" />
					</Link>
				</div>
			</div>
			{more.length > 0 && (
				<section className="mt-12">
					<h2 className="text-xl font-bold tracking-tight">
						More from {shop.name}
					</h2>
					<ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
						{more.map((x, i) => (
							<ProductCard key={x.id} p={x} usd={usd} showShop={false} i={i} />
						))}
					</ul>
				</section>
			)}
		</MarketShell>
	);
}
