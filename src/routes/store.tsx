import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "#/components/Logo";
import { ProductArt } from "#/components/ProductArt";
import { btn, Icon } from "#/components/ui";
import { fiat, zec } from "#/lib/format";
import { createInvoice } from "#/lib/invoice";
import { useZecUsd } from "#/lib/price";
import { encodeCart, PRODUCTS, STORE } from "#/lib/products";

export const Route = createFileRoute("/store")({
	head: () => ({ meta: [{ title: STORE }] }),
	component: Store,
});

function Stepper({
	name,
	n,
	onChange,
}: {
	name: string;
	n: number;
	onChange: (d: number) => void;
}) {
	const b =
		"press grid h-11 w-11 place-items-center rounded-xl text-xl font-bold hover:bg-malam/5 active:bg-malam/10";
	return (
		<div className="flex items-center rounded-2xl border border-malam/15 p-0.5">
			<button
				type="button"
				aria-label={`Remove one ${name}`}
				onClick={() => onChange(-1)}
				className={b}
			>
				−
			</button>
			<output
				aria-label={`${name} quantity`}
				className="w-8 text-center font-bold tnum"
			>
				{n}
			</output>
			<button
				type="button"
				aria-label={`Add one ${name}`}
				onClick={() => onChange(1)}
				className={b}
			>
				+
			</button>
		</div>
	);
}

function Store() {
	const navigate = useNavigate();
	const usd = useZecUsd();
	const [qty, setQty] = useState<Record<string, number>>({});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const lines = PRODUCTS.filter((p) => (qty[p.id] ?? 0) > 0);
	const count = lines.reduce((t, p) => t + qty[p.id], 0);
	const total = lines.reduce((t, p) => t + p.zat * qty[p.id], 0);

	const add = (id: string, d: number) => {
		setError("");
		setQty((q) => ({
			...q,
			[id]: Math.min(99, Math.max(0, (q[id] ?? 0) + d)),
		}));
	};

	const checkout = async () => {
		setBusy(true);
		setError("");
		try {
			const inv = await createInvoice({ data: { amountZat: total } });
			await navigate({
				to: "/checkout/$invoiceId",
				params: { invoiceId: inv.id },
				search: { z: inv.zip321_uri, o: encodeCart(qty) },
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
			setBusy(false);
		}
	};

	const checkoutBtn = (cls = "") => (
		<button
			type="button"
			disabled={total <= 0 || busy}
			onClick={checkout}
			className={`${btn.ink} w-full text-lg ${cls}`}
		>
			{busy ? (
				<>
					<span className="h-5 w-5 animate-spin rounded-full border-[3px] border-kertas/25 border-t-kertas motion-reduce:animate-none" />
					Preparing checkout…
				</>
			) : (
				<>
					<Icon name="lock" className="h-5 w-5" />
					Checkout · {zec(total)}
				</>
			)}
		</button>
	);

	return (
		<div className="on-light flex min-h-dvh flex-col bg-kertas text-malam">
			<header className="sticky top-0 z-10 border-b border-malam/10 bg-kertas/85 backdrop-blur-lg">
				<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
					<p className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
						<span className="grid h-8 w-8 place-items-center rounded-lg bg-malam text-kertas">
							<svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
								<path
									d="M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 11h1.5a2.5 2.5 0 0 1 0 5H16"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								/>
							</svg>
						</span>
						{STORE}
					</p>
					<a
						href="#cart"
						className="press relative flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-malam/5"
					>
						<Icon name="cart" className="h-5 w-5" />
						<span className="hidden sm:inline">Cart</span>
						{count > 0 && (
							<span
								key={count}
								className="rise grid h-6 min-w-6 place-items-center rounded-full bg-malam px-1.5 text-xs font-bold text-kertas tnum"
							>
								{count}
							</span>
						)}
					</a>
				</div>
			</header>

			<main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_22rem] lg:py-12">
				<section>
					<h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
						Small-batch Indonesian coffee
					</h1>
					<p className="mt-2 text-malam/60">
						Roasted weekly in Bandung. Pay privately with Zcash or any major
						crypto.
					</p>
					<ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{PRODUCTS.map((p, i) => {
							const n = qty[p.id] ?? 0;
							return (
								<li
									key={p.id}
									style={{ animationDelay: `${i * 50}ms` }}
									className="rise flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-malam/5"
								>
									<div
										style={{ background: p.tint }}
										className="px-8 pt-6 pb-2"
									>
										<ProductArt id={p.id} className="mx-auto h-36 w-full" />
									</div>
									<div className="flex flex-1 flex-col gap-4 p-5">
										<div>
											<h2 className="text-lg font-bold">{p.name}</h2>
											<p className="text-sm text-malam/60">{p.note}</p>
										</div>
										<div className="mt-auto flex items-end justify-between gap-3">
											<div>
												<p className="font-bold tnum">{zec(p.zat)}</p>
												<p className="h-5 text-sm text-malam/50 tnum">
													{fiat(p.zat, usd)}
												</p>
											</div>
											{n > 0 ? (
												<Stepper
													name={p.name}
													n={n}
													onChange={(d) => add(p.id, d)}
												/>
											) : (
												<button
													type="button"
													onClick={() => add(p.id, 1)}
													className={`${btn.ink} min-h-12 px-5`}
												>
													Add
												</button>
											)}
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				</section>

				<aside
					id="cart"
					className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start"
				>
					<div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-malam/5">
						<h2 className="text-lg font-bold">Your cart</h2>
						{lines.length === 0 ? (
							<p className="mt-6 mb-2 text-center text-sm text-malam/50">
								Your cart is empty. Add something tasty.
							</p>
						) : (
							<ul className="mt-4 flex flex-col divide-y divide-malam/10">
								{lines.map((p) => (
									<li key={p.id} className="flex items-center gap-3 py-3">
										<div
											style={{ background: p.tint }}
											className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
										>
											<ProductArt id={p.id} className="h-10 w-10" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-semibold">{p.name}</p>
											<p className="text-xs text-malam/50 tnum">
												{qty[p.id]} × {zec(p.zat)}
											</p>
										</div>
										<p className="text-sm font-semibold tnum">
											{zec(p.zat * qty[p.id])}
										</p>
									</li>
								))}
							</ul>
						)}
						<div className="mt-4 flex items-baseline justify-between border-t border-malam/10 pt-4">
							<span className="font-semibold">Total</span>
							<span className="text-right">
								<span className="block text-xl font-extrabold tnum">
									{zec(total)}
								</span>
								<span className="block h-5 text-sm text-malam/50 tnum">
									{total > 0 && fiat(total, usd)}
								</span>
							</span>
						</div>
						{error && (
							<p
								role="alert"
								className="rise mt-4 flex items-start gap-2 rounded-xl bg-danger-ink/10 p-3 text-sm font-medium text-danger-ink"
							>
								<Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
								{error}
							</p>
						)}
						{checkoutBtn("mt-5")}
					</div>
				</aside>
			</main>

			{count > 0 && (
				<div className="toast sticky bottom-0 z-10 border-t border-malam/10 bg-kertas/90 p-4 backdrop-blur-lg lg:hidden">
					{checkoutBtn()}
				</div>
			)}

			<footer className="border-t border-malam/10">
				<div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-malam/60 sm:px-6">
					<span>© {STORE}</span>
					<span className="flex items-center gap-2">
						Payments by <Logo tone="light" />
					</span>
				</div>
			</footer>
		</div>
	);
}
