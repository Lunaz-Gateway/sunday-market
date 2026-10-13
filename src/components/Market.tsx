import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ProductArt } from "#/components/ProductArt";
import { Icon, toast } from "#/components/ui";
import { addToCart, countOf, useCart } from "#/lib/cart";
import { MARKET, type Product, type Shop, shopOf } from "#/lib/catalog";
import { fiat, zec } from "#/lib/format";

const base =
	"press inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold disabled:cursor-not-allowed disabled:opacity-50";
export const mbtn = {
	primary: `${base} bg-pasar text-white hover:bg-pasar-dark`,
	outline: `${base} border border-pasar text-pasar hover:bg-pasar-soft`,
	quiet: `${base} bg-stone-100 text-stone-900 hover:bg-stone-200`,
};

export function MarketLogo() {
	return (
		<span className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-stone-900">
			<svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
				<rect width="32" height="32" rx="9" fill="var(--color-pasar)" />
				<path d="M6 13l3-6h14l3 6z" fill="#fff" />
				<path
					d="M6 13a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"
					fill="#F2B84B"
				/>
				<path
					d="M9 17v8h14v-8M14 25v-5h4v5"
					fill="none"
					stroke="#fff"
					strokeWidth="2"
				/>
			</svg>
			{MARKET}
		</span>
	);
}

export function LunazBadge({ label = "Payments by" }: { label?: string }) {
	return (
		<span className="inline-flex items-center gap-2 rounded-full bg-malam py-1.5 pr-3 pl-3 text-xs font-semibold whitespace-nowrap text-kertas">
			{label}
			<img
				src="/lunaz-horizontal-on-dark.svg"
				alt="Lunaz"
				width={948}
				height={256}
				className="h-3.5 w-auto"
			/>
		</span>
	);
}

export function Price({
	zat,
	usd,
	big = false,
}: {
	zat: number;
	usd: number | null;
	big?: boolean;
}) {
	return (
		<span className="flex flex-wrap items-baseline gap-x-2">
			<span
				className={`font-bold whitespace-nowrap text-stone-900 tnum ${big ? "text-3xl tracking-tight" : ""}`}
			>
				{zec(zat)}
			</span>
			<span
				className={`whitespace-nowrap text-stone-500 tnum ${big ? "text-base" : "text-sm"}`}
			>
				{fiat(zat, usd)}
			</span>
		</span>
	);
}

export function ShopAvatar({
	shop,
	className = "h-12 w-12 rounded-2xl",
}: {
	shop: Shop;
	className?: string;
}) {
	return (
		<span
			style={{ background: shop.color }}
			className={`grid shrink-0 place-items-center overflow-hidden ring-1 ring-black/5 ${className}`}
		>
			<ProductArt art={shop.art} className="w-[125%] max-w-none" />
		</span>
	);
}

export function Stepper({
	name,
	n,
	onChange,
	min = 0,
}: {
	name: string;
	n: number;
	onChange: (n: number) => void;
	min?: number;
}) {
	const b =
		"press grid h-11 w-11 place-items-center rounded-lg text-xl font-bold text-stone-700 hover:bg-stone-100 active:bg-stone-200 disabled:opacity-30";
	return (
		<div className="inline-flex min-h-12 items-center rounded-xl border border-stone-300 bg-white p-0.5">
			<button
				type="button"
				aria-label={`Remove one ${name}`}
				disabled={n <= min}
				onClick={() => onChange(n - 1)}
				className={b}
			>
				−
			</button>
			<output
				aria-label={`${name} quantity`}
				className="min-w-8 text-center font-bold tnum"
			>
				{n}
			</output>
			<button
				type="button"
				aria-label={`Add one ${name}`}
				disabled={n >= 99}
				onClick={() => onChange(n + 1)}
				className={b}
			>
				+
			</button>
		</div>
	);
}

export function add(p: Product, n = 1) {
	addToCart(p.id, n);
	toast(n > 1 ? `${n} × ${p.name} added to cart` : `${p.name} added to cart`);
}

export function ProductCard({
	p,
	usd,
	showShop = true,
	i = 0,
}: {
	p: Product;
	usd: number | null;
	showShop?: boolean;
	i?: number;
}) {
	const shop = shopOf(p.shop);
	return (
		<li
			style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
			className="rise group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200 transition-shadow duration-200 hover:shadow-lg hover:shadow-stone-900/5"
		>
			<div style={{ background: p.tint }} className="px-6 pt-5 pb-2">
				<ProductArt
					art={p.art}
					accent={p.accent}
					className="mx-auto h-24 w-full transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-[1.04] motion-reduce:transition-none sm:h-32"
				/>
			</div>
			<div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
				<div className="min-w-0">
					<h3 className="leading-snug font-semibold text-stone-900">
						<Link
							to="/product/$id"
							params={{ id: p.id }}
							className="after:absolute after:inset-0 after:content-['']"
						>
							{p.name}
						</Link>
					</h3>
					<p className="truncate text-sm text-stone-500">{p.note}</p>
				</div>
				<div className="mt-auto flex flex-col gap-3">
					<Price zat={p.zat} usd={usd} />
					{showShop && shop && (
						<Link
							to="/shop/$slug"
							params={{ slug: shop.slug }}
							className="relative z-[1] -my-1 flex min-h-8 items-center gap-1.5 self-start text-xs font-medium text-stone-600 hover:text-pasar"
						>
							<ShopAvatar shop={shop} className="h-5 w-5 rounded-md" />
							<span className="truncate">{shop.name}</span>
						</Link>
					)}
					<button
						type="button"
						onClick={() => add(p)}
						aria-label={`Add ${p.name} to cart`}
						className={`${mbtn.outline} relative z-[1] min-h-11 w-full text-sm`}
					>
						<Icon name="cart" className="h-4 w-4" />
						Add
					</button>
				</div>
			</div>
		</li>
	);
}

export function Spinner() {
	return (
		<span className="h-5 w-5 animate-spin rounded-full border-[3px] border-current/25 border-t-current motion-reduce:animate-none" />
	);
}

export function ErrorNote({ text }: { text: string }) {
	return text ? (
		<p
			role="alert"
			className="rise flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800"
		>
			<Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
			{text}
		</p>
	) : null;
}

function Search({ q }: { q: string }) {
	const navigate = useNavigate();
	const home = useRouterState({ select: (s) => s.location.pathname === "/" });
	return (
		<search className="flex-1">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					const v = new FormData(e.currentTarget).get("q")?.toString().trim();
					navigate({ to: "/", search: { q: v || undefined } });
				}}
				className="relative"
			>
				<svg
					viewBox="0 0 24 24"
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-stone-400"
				>
					<path
						d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</svg>
				<input
					key={home ? "home" : q}
					name="q"
					type="search"
					defaultValue={q}
					aria-label={`Search ${MARKET}`}
					placeholder="Search coffee, batik, books…"
					autoComplete="off"
					onChange={(e) => {
						if (!home) return;
						const v = e.target.value.trim();
						navigate({
							to: "/",
							search: (s) => ({ ...s, q: v || undefined }),
							replace: true,
						});
					}}
					className="h-11 w-full rounded-xl bg-stone-100 pr-3 pl-11 text-base text-stone-900 ring-1 ring-transparent transition-shadow duration-150 placeholder:text-stone-500 focus:bg-white focus:ring-2 focus:ring-pasar focus:outline-none sm:text-sm"
				/>
			</form>
		</search>
	);
}

function CartButton() {
	const n = countOf(useCart());
	return (
		<Link
			to="/cart"
			aria-label={n ? `Cart, ${n} items` : "Cart"}
			className="press relative flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 font-semibold text-stone-800 hover:bg-stone-100"
		>
			<Icon name="cart" className="h-6 w-6" />
			<span className="hidden md:inline">Cart</span>
			{n > 0 && (
				<span
					key={n}
					className="stamp absolute top-0.5 left-6 grid h-5 min-w-5 place-items-center rounded-full bg-pasar px-1 text-[0.7rem] font-bold text-white tnum md:static md:h-6 md:min-w-6 md:text-xs"
				>
					{n}
				</span>
			)}
		</Link>
	);
}

function CartBar() {
	const cart = useCart();
	const n = countOf(cart);
	if (!n) return null;
	return (
		<div
			data-cartbar
			className="toast fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden"
		>
			<Link to="/cart" className={`${mbtn.primary} w-full`}>
				<Icon name="cart" className="h-5 w-5" />
				View cart · {n} {n === 1 ? "item" : "items"}
			</Link>
		</div>
	);
}

export function MarketShell({
	children,
	q = "",
	cartBar = true,
}: {
	children: React.ReactNode;
	q?: string;
	cartBar?: boolean;
}) {
	return (
		<div className="market flex min-h-dvh flex-col bg-stone-50 text-stone-900">
			<header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/85 backdrop-blur-lg">
				<div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:flex-nowrap sm:px-6">
					<Link to="/" search={{}} className="shrink-0 rounded-lg">
						<MarketLogo />
					</Link>
					<div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
						<Search q={q} />
					</div>
					<div className="ml-auto sm:ml-0">
						<CartButton />
					</div>
				</div>
			</header>
			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
				{children}
			</main>
			<footer className="border-t border-stone-200 bg-white">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<div className="flex flex-col gap-1">
						<MarketLogo />
						<p>Independent Indonesian shops, one cart.</p>
					</div>
					<div className="flex flex-col items-start gap-2 sm:items-end">
						<LunazBadge />
						<p>
							Private by default: each shop is paid straight to its own wallet.
						</p>
					</div>
				</div>
			</footer>
			{cartBar && <CartBar />}
		</div>
	);
}
