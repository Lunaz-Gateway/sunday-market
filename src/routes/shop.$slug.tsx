import { createFileRoute, notFound } from "@tanstack/react-router";
import {
	LunazBadge,
	MarketShell,
	ProductCard,
	ShopAvatar,
} from "#/components/Market";
import {
	categoryOf,
	MARKET,
	productsOf,
	type Shop,
	shopOf,
} from "#/lib/catalog";
import { useZecUsd } from "#/lib/price";

export const Route = createFileRoute("/shop/$slug")({
	loader: ({ params }) => {
		const shop = shopOf(params.slug);
		if (!shop) throw notFound();
		return shop;
	},
	head: ({ loaderData }) => ({
		meta: [{ title: `${(loaderData as Shop | undefined)?.name} · ${MARKET}` }],
	}),
	component: ShopPage,
});

function ShopPage() {
	const shop = Route.useLoaderData();
	const usd = useZecUsd();
	const list = productsOf(shop.slug);
	return (
		<MarketShell>
			<section className="rise overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200">
				<div
					style={{
						backgroundColor: shop.color,
						backgroundImage:
							"radial-gradient(rgb(28 31 61 / 0.1) 1.5px, transparent 1.5px)",
						backgroundSize: "14px 14px",
					}}
					className="h-20 sm:h-28"
				/>
				<div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:gap-6 sm:px-8">
					<ShopAvatar
						shop={shop}
						className="-mt-10 h-20 w-20 rounded-3xl ring-4 ring-white sm:-mt-12 sm:h-24 sm:w-24"
					/>
					<div className="min-w-0 flex-1">
						<h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
							{shop.name}
						</h1>
						<p className="mt-1 text-stone-600">{shop.tagline}</p>
						<p className="mt-2 text-sm text-stone-500">
							{shop.city} · {categoryOf(shop.category)} · {list.length} products
						</p>
					</div>
					<div className="flex flex-col items-start gap-1.5 sm:items-end">
						<LunazBadge label="Private payments via" />
						<p className="text-xs text-stone-500">
							Paid straight to this shop's own wallet
						</p>
					</div>
				</div>
			</section>
			<h2 className="mt-8 text-xl font-bold tracking-tight">Products</h2>
			<ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
				{list.map((p, i) => (
					<ProductCard key={p.id} p={p} usd={usd} showShop={false} i={i} />
				))}
			</ul>
		</MarketShell>
	);
}
