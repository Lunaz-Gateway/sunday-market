import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	CheckoutShell,
	type Details,
	OrderSummary,
	readDraft,
	rememberOrder,
	saveDraft,
	saveOrder,
	useHydrated,
} from "#/components/Checkout";
import { ErrorNote, mbtn, Spinner } from "#/components/Market";
import { Icon } from "#/components/ui";
import { useCart } from "#/lib/cart";
import {
	decodeLines,
	encodeLines,
	type Line,
	MARKET,
	MIN_SWAP_ZAT,
	productsOf,
	type Shop,
	shopOf,
	totalOf,
} from "#/lib/catalog";
import { zec } from "#/lib/format";
import { createOrder } from "#/lib/invoice";
import { useZecUsd } from "#/lib/price";

type Search = { seller?: string; buy?: string; step?: "payment" };

// seller: shop slug. buy: "id:qty" for Buy now (otherwise the cart). step: details | payment.
export const Route = createFileRoute("/checkout/")({
	validateSearch: (s: Record<string, unknown>): Search => ({
		seller: typeof s.seller === "string" ? s.seller : undefined,
		buy: typeof s.buy === "string" ? s.buy : undefined,
		step: s.step === "payment" ? "payment" : undefined,
	}),
	head: () => ({ meta: [{ title: `Checkout · ${MARKET}` }] }),
	component: CheckoutPage,
});

function CheckoutPage() {
	const { seller, buy, step } = Route.useSearch();
	const shop = shopOf(seller ?? "");
	const cart = useCart();
	const hydrated = useHydrated();
	const usd = useZecUsd();
	const lines: Line[] = shop
		? buy
			? decodeLines(buy).filter((l) => l.shop === shop.slug)
			: productsOf(shop.slug)
					.filter((p) => cart[p.id])
					.map((p) => ({ ...p, qty: cart[p.id] }))
		: [];
	const n = step === "payment" ? 2 : 1;

	if (!hydrated) {
		return (
			<CheckoutShell
				step={n}
				aside={<span className="skeleton block h-64 rounded-2xl" />}
			>
				<span className="skeleton block h-96 rounded-3xl" />
			</CheckoutShell>
		);
	}
	if (!shop || !lines.length) {
		return (
			<CheckoutShell step={1}>
				<div className="rise flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-stone-200">
					<span className="grid h-14 w-14 place-items-center rounded-full bg-stone-100">
						<Icon name="cart" className="h-7 w-7 text-stone-500" />
					</span>
					<h1 className="text-lg font-bold">Nothing to check out</h1>
					<p className="max-w-sm text-stone-500">
						{shop
							? `Your cart has nothing from ${shop.name} right now.`
							: "Pick a shop from your cart to check out."}
					</p>
					<Link to="/cart" className={`${mbtn.primary} mt-2`}>
						Go to cart
					</Link>
				</div>
			</CheckoutShell>
		);
	}
	return (
		<CheckoutShell
			step={n}
			aside={<OrderSummary shop={shop} lines={lines} usd={usd} />}
		>
			<Flow shop={shop} lines={lines} buy={buy} step={step} />
		</CheckoutShell>
	);
}

const field =
	"w-full rounded-xl bg-white px-4 text-base ring-1 ring-stone-300 transition-shadow duration-150 placeholder:text-stone-500 focus:ring-2 focus:ring-pasar focus:outline-none";

function Flow({
	shop,
	lines,
	buy,
	step,
}: {
	shop: Shop;
	lines: Line[];
	buy?: string;
	step?: "payment";
}) {
	const navigate = useNavigate();
	// Mounted only after hydration, so the draft can be read right away.
	const [d, setD] = useState<Details>(readDraft);
	const set =
		(k: keyof Details) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			setD({ ...d, [k]: e.target.value });
	const total = totalOf(lines);
	const swapOk = total >= MIN_SWAP_ZAT;
	const [method, setMethod] = useState<"zec" | "other">("zec");
	const [busy, setBusy] = useState(false);
	const [badEmail, setBadEmail] = useState(false);
	const [error, setError] = useState("");
	const search = { seller: shop.slug, buy };

	if (step !== "payment") {
		return (
			<form
				noValidate
				className="rise flex flex-col gap-5 rounded-3xl bg-white p-5 ring-1 ring-stone-200 sm:p-8"
				onSubmit={(e) => {
					e.preventDefault();
					const email = e.currentTarget.elements.namedItem(
						"email",
					) as HTMLInputElement;
					if (!email.validity.valid) {
						setBadEmail(true);
						email.focus();
						return;
					}
					saveDraft(d);
					navigate({ to: "/checkout", search: { ...search, step: "payment" } });
				}}
			>
				<div>
					<h1 className="text-2xl font-extrabold tracking-tight">
						Contact and delivery
					</h1>
					<p className="mt-1 flex items-start gap-2 text-sm text-stone-500">
						<Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
						All fields are optional. This is a demo store: nothing ships, and
						your details stay in this browser.
					</p>
				</div>
				<label className="flex flex-col gap-1.5 text-sm font-semibold">
					<span>
						Email <span className="font-normal text-stone-500">(optional)</span>
					</span>
					<input
						name="email"
						type="email"
						autoComplete="email"
						inputMode="email"
						autoCapitalize="off"
						spellCheck={false}
						value={d.email}
						onChange={(e) => {
							set("email")(e);
							if (badEmail) setBadEmail(!e.target.validity.valid);
						}}
						onBlur={(e) => setBadEmail(!e.target.validity.valid)}
						aria-invalid={badEmail}
						aria-describedby={badEmail ? "email-error" : undefined}
						placeholder="you@example.com"
						className={`${field} h-12 aria-invalid:ring-2 aria-invalid:ring-red-700`}
					/>
					{badEmail && (
						<span
							id="email-error"
							className="flex items-center gap-1.5 text-sm font-medium text-red-700"
						>
							<Icon name="alert" className="h-4 w-4 shrink-0" />
							Enter an email like name@example.com, or leave it empty.
						</span>
					)}
				</label>
				<label className="flex flex-col gap-1.5 text-sm font-semibold">
					<span>
						Full name{" "}
						<span className="font-normal text-stone-500">(optional)</span>
					</span>
					<input
						autoComplete="name"
						autoCapitalize="words"
						value={d.name}
						onChange={set("name")}
						className={`${field} h-12`}
					/>
				</label>
				<label className="flex flex-col gap-1.5 text-sm font-semibold">
					<span>
						Delivery address{" "}
						<span className="font-normal text-stone-500">(optional)</span>
					</span>
					<textarea
						autoComplete="street-address"
						rows={2}
						value={d.address}
						onChange={set("address")}
						className={`${field} py-3`}
					/>
				</label>
				<label className="flex flex-col gap-1.5 text-sm font-semibold">
					<span>
						Note to {shop.name}{" "}
						<span className="font-normal text-stone-500">(optional)</span>
					</span>
					<textarea
						rows={2}
						value={d.notes}
						onChange={set("notes")}
						placeholder="Gift wrap, delivery time…"
						className={`${field} py-3`}
					/>
				</label>
				<button type="submit" className={`${mbtn.primary} min-h-14 text-base`}>
					Continue to payment
					<Icon name="back" className="h-5 w-5 rotate-180" />
				</button>
			</form>
		);
	}

	const place = async () => {
		setBusy(true);
		setError("");
		const o = encodeLines(Object.fromEntries(lines.map((l) => [l.id, l.qty])));
		try {
			const inv = await createOrder({
				data: { seller: shop.slug, lines: o, email: d.email },
			});
			rememberOrder(inv.orderId);
			saveOrder(inv.id, { ...d, seller: shop.slug, o, buyNow: Boolean(buy) });
			await navigate({
				to: "/checkout/$invoiceId",
				params: { invoiceId: inv.id },
				search: {
					z: inv.zip321_uri,
					o,
					s: shop.slug,
					m: method === "other" ? method : undefined,
				},
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
			setBusy(false);
		}
	};
	const contact = [d.email, d.name].filter(Boolean).join(" · ");
	const card =
		"press relative flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-stone-300 transition-shadow duration-150 has-[:checked]:ring-2 has-[:checked]:ring-pasar has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-stone-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-pasar";
	const radio = "mt-1 h-5 w-5 shrink-0 accent-[var(--color-pasar)]";

	return (
		<div className="rise flex flex-col gap-5 rounded-3xl bg-white p-5 ring-1 ring-stone-200 sm:p-8">
			<h1 className="text-2xl font-extrabold tracking-tight">Payment</h1>
			<div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm">
				<span className="min-w-0">
					<span className="block text-xs font-medium text-stone-500">
						Contact
					</span>
					<span className="block truncate font-semibold">
						{contact || "No details given (that's fine)"}
					</span>
				</span>
				<Link
					to="/checkout"
					search={search}
					className="press min-h-11 shrink-0 rounded-lg px-3 py-2.5 font-bold text-pasar hover:bg-pasar-soft"
				>
					Edit<span className="sr-only"> contact details</span>
				</Link>
			</div>
			<fieldset className="flex flex-col gap-3">
				<legend className="mb-3 font-bold">Payment method</legend>
				<label className={card}>
					<input
						type="radio"
						name="method"
						value="zec"
						checked={method === "zec"}
						onChange={() => setMethod("zec")}
						className={radio}
					/>
					<span className="min-w-0 flex-1">
						<span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
							Zcash (shielded)
							<span className="rounded-full bg-pasar-soft px-2 py-0.5 text-xs font-bold whitespace-nowrap text-pasar">
								Most private
							</span>
						</span>
						<span className="mt-0.5 block text-sm text-stone-500">
							Scan a QR code or open your wallet. Works for any amount.
						</span>
					</span>
					<img src="/lunaz-symbol.svg" alt="" className="h-8 w-8 shrink-0" />
				</label>
				<label className={card}>
					<input
						type="radio"
						name="method"
						value="other"
						disabled={!swapOk}
						checked={method === "other"}
						onChange={() => setMethod("other")}
						aria-describedby="other-hint"
						className={radio}
					/>
					<span className="min-w-0 flex-1">
						<span
							className={`block font-bold ${swapOk ? "" : "text-stone-500"}`}
						>
							Other crypto
						</span>
						<span
							id="other-hint"
							className="mt-0.5 block text-sm text-stone-500"
						>
							{swapOk
								? "USDC, USDT, SOL, ETH or BTC, swapped to ZEC via NEAR Intents."
								: `Needs an order of at least 0.001 ZEC. Add ${zec(MIN_SWAP_ZAT - total)} more, or pay with Zcash.`}
						</span>
					</span>
					<span
						aria-hidden="true"
						className={`flex shrink-0 -space-x-2 ${swapOk ? "" : "opacity-40 grayscale"}`}
					>
						{["#2775CA", "#627EEA", "#F7931A"].map((c) => (
							<span
								key={c}
								style={{ background: c }}
								className="h-7 w-7 rounded-full ring-2 ring-white"
							/>
						))}
					</span>
				</label>
			</fieldset>
			<ErrorNote text={error} />
			<button
				type="button"
				disabled={busy}
				onClick={place}
				className={`${mbtn.primary} min-h-14 text-base`}
			>
				{busy ? (
					<>
						<Spinner />
						Placing order…
					</>
				) : (
					<>
						<Icon name="lock" className="h-5 w-5" />
						Place order · {zec(total)}
					</>
				)}
			</button>
			<p className="-mt-2 text-center text-xs text-stone-500">
				The payment goes straight to {shop.name}'s own wallet. You'll get a
				payment address on the next screen.
			</p>
		</div>
	);
}
