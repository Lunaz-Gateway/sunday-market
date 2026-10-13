import { createFileRoute, Link } from "@tanstack/react-router";
import {
	LunazBadge,
	MarketShell,
	ProductCard,
	ShopAvatar,
} from "#/components/Market";
import { ProductArt } from "#/components/ProductArt";
import { TESTNET } from "#/components/TestnetBanner";
import {
	CATEGORIES,
	type Category,
	categoryOf,
	MARKET,
	PRODUCTS,
	productsOf,
	SHOPS,
	shopOf,
} from "#/lib/catalog";
import { useZecUsd } from "#/lib/price";

export const Route = createFileRoute("/")({
	validateSearch: (
		s: Record<string, unknown>,
	): { q?: string; c?: Category } => ({
		q: typeof s.q === "string" && s.q.trim() ? s.q.slice(0, 80) : undefined,
		c: CATEGORIES.some((c) => c.id === s.c) ? (s.c as Category) : undefined,
	}),
	head: () => ({ meta: [{ title: `${MARKET} · shop small, pay privately` }] }),
	component: Home,
});

function matches(q: string, c?: Category) {
	const words = q.toLowerCase().split(/\s+/).filter(Boolean);
	return PRODUCTS.filter((p) => {
		const shop = shopOf(p.shop);
		if (c && shop?.category !== c) return false;
		const hay =
			`${p.name} ${p.note} ${shop?.name} ${categoryOf(shop?.category ?? "")}`.toLowerCase();
		return words.every((w) => hay.includes(w));
	});
}

function Home() {
	const { q, c } = Route.useSearch();
	const usd = useZecUsd();
	const list = matches(q ?? "", c);
	const browsing = !q && !c;
	const chip =
		"press flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap ring-1 transition-colors duration-150";

	return (
		<MarketShell q={q}>
			{browsing && <Hero />}

			<nav
				aria-label="Categories"
				className={`no-scrollbar -mx-4 flex ${browsing ? "mt-6" : ""} gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0`}
			>
				{[{ id: undefined, label: "All" }, ...CATEGORIES].map((cat) => {
					const on = c === cat.id;
					return (
						<Link
							key={cat.label}
							to="/"
							search={{ q, c: cat.id }}
							aria-current={on ? "page" : undefined}
							className={`${chip} ${on ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-200 hover:bg-stone-100"}`}
						>
							{cat.label}
						</Link>
					);
				})}
			</nav>

			{browsing && (
				<section aria-labelledby="shops" className="mt-10">
					<div className="flex items-baseline justify-between">
						<h2 id="shops" className="text-xl font-bold tracking-tight">
							Featured shops
						</h2>
						<p className="text-sm text-stone-500">Each one a Lunaz merchant</p>
					</div>
					<ul className="no-scrollbar -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-5">
						{SHOPS.map((s) => (
							<li
								key={s.slug}
								className="relative flex w-56 shrink-0 snap-start flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200 transition-shadow duration-200 hover:shadow-lg hover:shadow-stone-900/5 sm:w-auto"
							>
								<ShopAvatar shop={s} />
								<div className="min-w-0">
									<h3 className="font-bold">
										<Link
											to="/shop/$slug"
											params={{ slug: s.slug }}
											className="after:absolute after:inset-0 after:content-['']"
										>
											{s.name}
										</Link>
									</h3>
									<p className="mt-0.5 line-clamp-2 text-sm text-stone-500">
										{s.tagline}
									</p>
								</div>
								<p className="mt-auto text-xs font-medium text-stone-500">
									{s.city} · {productsOf(s.slug).length} products
								</p>
							</li>
						))}
					</ul>
				</section>
			)}

			<section aria-labelledby="products" className="mt-10">
				<div className="flex items-baseline justify-between gap-4">
					<h2
						id="products"
						className="min-w-0 truncate text-xl font-bold tracking-tight"
					>
						{q
							? `Results for “${q}”`
							: c
								? categoryOf(c)
								: "Fresh from the shops"}
					</h2>
					<p
						className="shrink-0 text-sm text-stone-500 tnum"
						aria-live="polite"
					>
						{list.length} {list.length === 1 ? "product" : "products"}
					</p>
				</div>
				{list.length ? (
					<ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
						{list.map((p, i) => (
							<ProductCard key={p.id} p={p} usd={usd} i={i} />
						))}
					</ul>
				) : (
					<div className="rise mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-stone-200">
						<p className="text-lg font-bold">
							{q ? `No products match “${q}”` : "No products here yet"}
						</p>
						<p className="max-w-sm text-stone-500">
							Check the spelling or try a shorter word. You can also browse all{" "}
							{PRODUCTS.length} products from {SHOPS.length} shops.
						</p>
						<Link
							to="/"
							className="press mt-2 min-h-11 rounded-xl px-4 py-2.5 font-bold text-pasar hover:bg-pasar-soft"
						>
							Browse all products
						</Link>
					</div>
				)}
			</section>
		</MarketShell>
	);
}

function Hero() {
	return (
		<section className="rise relative overflow-hidden rounded-3xl bg-pasar px-6 py-8 text-white sm:px-10 sm:py-12">
			<div className="relative z-[1] max-w-md">
				<p className="text-sm font-semibold text-white/70">
					{SHOPS.length} independent shops · one cart
				</p>
				<h1 className="mt-2 text-3xl leading-[1.05] font-extrabold tracking-[-0.02em] text-balance sm:text-5xl">
					Shop small. Pay privately.
				</h1>
				<p className="mt-3 max-w-sm text-white/80">
					Every order goes straight to the seller's own shielded wallet. Pay
					with ZEC, or with USDC, SOL, BTC or ETH{TESTNET && " (mainnet only)"}.
				</p>
				<div className="mt-5">
					<LunazBadge label="Private payments by" />
				</div>
			</div>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -right-6 bottom-0 hidden w-[46%] grid-cols-3 gap-3 sm:grid"
			>
				{(["beans", "shirt", "book", "earbuds", "jar", "cake"] as const).map(
					(art, i) => (
						<span
							key={art}
							style={{
								background: SHOPS[i % SHOPS.length].color,
								transform: `translateY(${i % 2 ? 18 : 0}px)`,
							}}
							className="grid aspect-square place-items-center rounded-2xl"
						>
							<ProductArt art={art} className="w-[85%]" />
						</span>
					),
				)}
			</div>
		</section>
	);
}
