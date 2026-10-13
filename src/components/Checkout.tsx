import { Link } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { LunazBadge, MarketLogo, ShopAvatar } from "#/components/Market";
import { ProductArt } from "#/components/ProductArt";
import { Icon } from "#/components/ui";
import { type Line, MARKET, type Shop, totalOf } from "#/lib/catalog";
import { fiat, zec } from "#/lib/format";

// Demo-only buyer details: kept in this browser, never sent to Lunaz or the shop.
export type Details = {
	email: string;
	name: string;
	address: string;
	notes: string;
};
export type OrderRecord = Details & {
	seller: string;
	o: string;
	buyNow: boolean;
};

const DRAFT = "checkout.details";
export const blankDetails: Details = {
	email: "",
	name: "",
	address: "",
	notes: "",
};

export function readDraft(): Details {
	try {
		return {
			...blankDetails,
			...JSON.parse(localStorage.getItem(DRAFT) ?? "{}"),
		};
	} catch {
		return blankDetails;
	}
}

export function saveDraft(d: Details) {
	try {
		localStorage.setItem(DRAFT, JSON.stringify(d));
	} catch {}
}

export function saveOrder(id: string, rec: OrderRecord) {
	try {
		localStorage.setItem(`order:${id}`, JSON.stringify(rec));
	} catch {}
}

export function readOrder(id: string): OrderRecord | null {
	try {
		return JSON.parse(localStorage.getItem(`order:${id}`) ?? "null");
	} catch {
		return null;
	}
}

const noop = () => () => {};
export const useHydrated = () =>
	useSyncExternalStore(
		noop,
		() => true,
		() => false,
	);

const STEPS = ["Cart", "Details", "Payment", "Done"];

function Steps({ current }: { current: number }) {
	return (
		<nav aria-label="Checkout progress">
			<ol className="grid grid-cols-4">
				{STEPS.map((s, i) => {
					const done = i < current || current === 3;
					const cur = i === current;
					const dot = (
						<span
							className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-colors duration-200 ${done ? "bg-pasar text-white" : cur ? "bg-white text-pasar ring-2 ring-pasar" : "bg-white text-stone-500 ring-1 ring-stone-300"}`}
						>
							{done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
						</span>
					);
					return (
						<li
							key={s}
							aria-current={cur ? "step" : undefined}
							className="relative flex flex-col items-center gap-1.5 text-xs font-semibold sm:text-sm"
						>
							{i < 3 && (
								<span
									aria-hidden="true"
									className={`absolute top-3.5 left-[calc(50%+1.25rem)] h-0.5 w-[calc(100%-2.5rem)] rounded-full ${i < current ? "bg-pasar" : "bg-stone-200"}`}
								/>
							)}
							{i === 0 && current > 0 && current < 3 ? (
								<Link
									to="/cart"
									className="flex flex-col items-center gap-1.5 rounded-lg text-stone-700 hover:text-pasar"
								>
									{dot}
									{s}
									<span className="sr-only">(completed, go back)</span>
								</Link>
							) : (
								<>
									{dot}
									<span
										className={
											cur
												? "text-stone-900"
												: done
													? "text-stone-700"
													: "text-stone-500"
										}
									>
										{s}
										{done && <span className="sr-only"> (completed)</span>}
									</span>
								</>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

export function TrustRow() {
	return (
		<ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-stone-500">
			<li className="flex items-center gap-1.5">
				<Icon name="wallet" className="h-4 w-4" />
				Non-custodial
			</li>
			<li className="flex items-center gap-1.5">
				<Icon name="lock" className="h-4 w-4" />
				Private by default
			</li>
			<li>
				<LunazBadge />
			</li>
		</ul>
	);
}

export function CheckoutShell({
	step,
	aside,
	children,
}: {
	step: number;
	aside?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="market flex min-h-dvh flex-col bg-stone-50 text-stone-900">
			<header className="border-b border-stone-200 bg-white">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
					<Link to="/" className="shrink-0 rounded-lg">
						<MarketLogo />
					</Link>
					<p className="flex items-center gap-1.5 text-sm font-semibold text-stone-600">
						<Icon name="lock" className="h-4 w-4 text-pasar" />
						Secure checkout
					</p>
				</div>
				<div className="mx-auto w-full max-w-2xl px-4 pt-1 pb-4 sm:px-6">
					<Steps current={step} />
				</div>
			</header>
			<div
				className={`mx-auto grid w-full max-w-6xl flex-1 items-start gap-5 px-4 py-5 sm:px-6 sm:py-8 ${aside ? "lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-8" : "max-w-2xl"}`}
			>
				{aside && (
					<details className="group rounded-2xl bg-white ring-1 ring-stone-200 lg:hidden">
						<summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
							<Icon name="cart" className="h-5 w-5 text-pasar" />
							<span className="group-open:hidden">Show order summary</span>
							<span className="hidden group-open:inline">
								Hide order summary
							</span>
							<Icon
								name="back"
								className="h-4 w-4 -rotate-90 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
							/>
						</summary>
						<div className="border-t border-stone-100 p-4">{aside}</div>
					</details>
				)}
				<main className="flex min-w-0 flex-col gap-5">{children}</main>
				{aside && (
					<aside
						aria-label="Order summary"
						className="sticky top-6 hidden rounded-3xl bg-white p-6 ring-1 ring-stone-200 lg:block"
					>
						{aside}
					</aside>
				)}
			</div>
			<footer className="border-t border-stone-200 bg-white px-4 py-6">
				<div className="mx-auto flex max-w-6xl flex-col items-center gap-3">
					<TrustRow />
					<p className="text-xs text-stone-500">
						{MARKET} is a demo store. Nothing ships.
					</p>
				</div>
			</footer>
		</div>
	);
}

export function OrderSummary({
	shop,
	lines,
	usd,
	children,
}: {
	shop?: Shop;
	lines: Line[];
	usd: number | null;
	children?: React.ReactNode;
}) {
	const total = totalOf(lines);
	const n = lines.reduce((t, l) => t + l.qty, 0);
	return (
		<div className="flex flex-col gap-4">
			{shop && (
				<Link
					to="/shop/$slug"
					params={{ slug: shop.slug }}
					className="flex items-center gap-3 rounded-xl hover:text-pasar"
				>
					<ShopAvatar shop={shop} className="h-10 w-10 rounded-xl" />
					<span className="min-w-0 flex-1">
						<span className="block text-xs font-medium text-stone-500">
							Sold by
						</span>
						<span className="block truncate font-bold">{shop.name}</span>
					</span>
					<span className="text-xs text-stone-500">{shop.city}</span>
				</Link>
			)}
			<ul className="flex flex-col gap-3 border-t border-stone-100 pt-4">
				{lines.map((l) => (
					<li key={l.id} className="flex items-center gap-3">
						<span
							style={{ background: l.tint }}
							className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl"
						>
							<ProductArt art={l.art} accent={l.accent} className="h-11 w-11" />
							<span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-stone-700 px-1 text-[0.7rem] font-bold text-white tnum">
								{l.qty}
								<span className="sr-only"> pieces</span>
							</span>
						</span>
						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm font-semibold">
								{l.name}
							</span>
							<span className="block truncate text-xs text-stone-500">
								{l.note}
							</span>
						</span>
						<span className="text-sm font-semibold tnum">
							{zec(l.zat * l.qty)}
						</span>
					</li>
				))}
			</ul>
			<dl className="flex flex-col gap-2 border-t border-stone-100 pt-4 text-sm">
				<div className="flex justify-between gap-4">
					<dt className="text-stone-500">
						Subtotal · {n} {n === 1 ? "item" : "items"}
					</dt>
					<dd className="font-semibold tnum">{zec(total)}</dd>
				</div>
				<div className="flex justify-between gap-4">
					<dt className="text-stone-500">Delivery</dt>
					<dd className="text-right text-stone-500">Demo, no shipping</dd>
				</div>
				{children}
				<div className="mt-1 flex items-baseline justify-between gap-4 border-t border-stone-100 pt-3">
					<dt className="font-bold">Total</dt>
					<dd className="text-right">
						<span className="block text-lg font-extrabold tnum">
							{zec(total)}
						</span>
						<span className="block h-4 text-xs text-stone-500 tnum">
							{fiat(total, usd)}
						</span>
					</dd>
				</div>
			</dl>
			<p className="flex gap-2 rounded-xl bg-pasar-soft p-3 text-xs leading-relaxed text-pasar-dark">
				<Icon name="lock" className="h-4 w-4 shrink-0" />
				Paid privately in shielded Zcash. The shop never sees your wallet.
			</p>
		</div>
	);
}
