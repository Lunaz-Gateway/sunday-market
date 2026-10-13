import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
	CheckoutShell,
	type OrderRecord,
	OrderSummary,
	readOrder,
} from "#/components/Checkout";
import { mbtn } from "#/components/Market";
import { btn, CopyButton, Dot, Icon, QrCode, useNow } from "#/components/ui";
import { removeFromCart } from "#/lib/cart";
import {
	decodeLines,
	type Line,
	MARKET,
	MIN_SWAP_ZAT,
	type Shop,
	shopOf,
} from "#/lib/catalog";
import { clock, fiat, short, ZAT, zec } from "#/lib/format";
import {
	createSwap,
	getSwapAssets,
	type InvoiceDetail,
	loadInvoice,
	type SwapAsset,
	type SwapInfo,
} from "#/lib/invoice";
import { useZecUsd } from "#/lib/price";
import { useInvoiceStatus } from "#/lib/useInvoiceStatus";

export const Route = createFileRoute("/checkout/$invoiceId")({
	// z: ZIP-321 URI handed over by the creator (GET /v1/invoices lacks it).
	// o: order lines for the summary. s: seller slug. m: chosen payment method.
	validateSearch: (s: Record<string, unknown>) => ({
		z: typeof s.z === "string" && s.z.startsWith("zcash:") ? s.z : undefined,
		o: typeof s.o === "string" ? s.o : undefined,
		s: typeof s.s === "string" ? s.s : undefined,
		m: s.m === "other" ? ("other" as const) : undefined,
	}),
	loader: ({ params }) => loadInvoice({ data: { id: params.invoiceId } }),
	head: ({ match }) => ({
		meta: [
			{
				title: `Pay ${shopOf(match.search.s ?? "")?.name ?? "your order"} · ${MARKET}`,
			},
		],
	}),
	pendingComponent: Skeleton,
	component: Checkout,
});

const STEPS = [
	"Send your deposit",
	"Deposit received",
	"Swapping to ZEC",
	"Paid in shielded ZEC",
];
const STEP_OF: Record<string, number> = {
	PENDING_DEPOSIT: 0,
	KNOWN_DEPOSIT_TX: 1,
	INCOMPLETE_DEPOSIT: 1,
	PROCESSING: 2,
	SUCCESS: 3,
};
const RETRY = new Set(["REFUNDED", "FAILED", "INCOMPLETE_DEPOSIT"]);
const PROBLEM: Record<string, string> = {
	REFUNDED:
		"The swap couldn't complete, so your funds were refunded to your refund address.",
	FAILED:
		"The swap failed. Any deposit is returned to your refund address automatically.",
	INCOMPLETE_DEPOSIT:
		"The deposit was less than required and will be refunded. The invoice is still open: try again or pay with ZEC.",
};

const CHAINS: Record<string, { name: string; re: RegExp; hint: string }> = {
	eth: {
		name: "Ethereum",
		re: /^0x[0-9a-fA-F]{40}$/,
		hint: "An Ethereum address starting with 0x",
	},
	base: {
		name: "Base",
		re: /^0x[0-9a-fA-F]{40}$/,
		hint: "A Base address starting with 0x",
	},
	arb: {
		name: "Arbitrum",
		re: /^0x[0-9a-fA-F]{40}$/,
		hint: "An Arbitrum address starting with 0x",
	},
	sol: {
		name: "Solana",
		re: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
		hint: "A Solana wallet address",
	},
	btc: {
		name: "Bitcoin",
		re: /^(bc1[02-9ac-hj-np-z]{8,87}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
		hint: "A Bitcoin address starting with bc1, 1 or 3",
	},
	near: {
		name: "NEAR",
		re: /^([a-z\d]+[-_]?)*[a-z\d]+(\.([a-z\d]+[-_]?)*[a-z\d]+)*$/,
		hint: "A NEAR account like name.near",
	},
};
const chainName = (c: string) => CHAINS[c]?.name ?? c.toUpperCase();

const TOKEN_COLOR: Record<string, string> = {
	USDC: "#2775CA",
	USDT: "#26A17B",
	ETH: "#627EEA",
	SOL: "#7B3FE4",
	BTC: "#F7931A",
	WNEAR: "#1C1F3D",
};

function TokenBadge({
	symbol,
	size = "h-8 w-8",
}: {
	symbol: string;
	size?: string;
}) {
	const s = symbol.replace(/^w/, "").toUpperCase();
	return (
		<span
			aria-hidden="true"
			style={{ background: TOKEN_COLOR[symbol.toUpperCase()] ?? "#1C1F3D" }}
			className={`grid shrink-0 place-items-center rounded-full text-[0.6rem] font-extrabold tracking-tight text-white ring-2 ring-white ${size}`}
		>
			{s.slice(0, 4)}
		</span>
	);
}

const useShopName = () => shopOf(Route.useSearch().s ?? "")?.name;

function toMs(d: number | string): number {
	const n = Number(d);
	if (!Number.isNaN(n)) return n < 1e12 ? n * 1000 : n;
	return Date.parse(String(d));
}

function Checkout() {
	const invoice = Route.useLoaderData();
	if (!invoice) {
		return (
			<CheckoutShell step={2}>
				<div className="rise flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-stone-200">
					<h1 className="text-2xl font-extrabold tracking-tight">
						Order not found
					</h1>
					<p className="max-w-sm text-stone-500">
						This payment link is invalid or has been removed. Nothing was
						charged.
					</p>
					<Link to="/" className={`${mbtn.primary} mt-2`}>
						Continue shopping
					</Link>
				</div>
			</CheckoutShell>
		);
	}
	return <Page invoice={invoice} />;
}

function Page({ invoice }: { invoice: InvoiceDetail }) {
	const { z, o, s, m } = Route.useSearch();
	const shop = shopOf(s ?? "");
	const { status, swap, received, overpaid, txid, link } = useInvoiceStatus(
		invoice.id,
		invoice.status,
	);
	const usd = useZecUsd();
	const now = useNow();
	const left = Math.max(0, Math.floor(invoice.expires_at - now / 1000));
	const expired = status === "expired" || (status === "pending" && left === 0);
	const uri = invoice.zip321_uri ?? z;
	const lines = decodeLines(o);
	const paid = status === "paid";
	const open = !expired && (status === "pending" || status === "detected");
	// Buyer details live only in this browser (saved when the order was placed).
	const [rec, setRec] = useState<OrderRecord | null>(null);
	useEffect(() => setRec(readOrder(invoice.id)), [invoice.id]);
	// Paid lines leave the cart (Buy now orders never touched it).
	useEffect(() => {
		if (paid && !readOrder(invoice.id)?.buyNow)
			removeFromCart(decodeLines(o).map((l) => l.id));
	}, [paid, o, invoice.id]);

	const summary = (
		<OrderSummary shop={shop} lines={lines} usd={usd}>
			<div className="flex justify-between gap-4">
				<dt className="text-stone-500">Order</dt>
				<dd className="font-mono text-xs leading-5">#{orderNo(invoice.id)}</dd>
			</div>
		</OrderSummary>
	);

	return (
		<CheckoutShell step={paid ? 3 : 2} aside={paid ? undefined : summary}>
			{paid ? (
				<Confirmed
					invoice={invoice}
					shop={shop}
					lines={lines}
					usd={usd}
					overpaid={overpaid}
					txid={txid ?? invoice.txid}
					email={rec?.email}
				/>
			) : (
				<section className="on-light rise flex flex-col gap-6 rounded-3xl bg-white p-5 text-malam ring-1 ring-stone-200 sm:p-8">
					<div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
						<div>
							<p className="text-sm font-medium text-stone-500">
								Pay {shop?.name ?? "the shop"} · via {MARKET}
							</p>
							<p className="mt-1 text-4xl font-extrabold tracking-tight tnum">
								{zec(invoice.amount_zat)}
							</p>
							<p className="mt-0.5 h-6 text-stone-500 tnum">
								{fiat(invoice.amount_zat, usd)}
							</p>
						</div>
						{open && (
							<p
								className={`flex items-baseline gap-2 rounded-full px-3 py-1.5 sm:flex-col sm:items-end sm:gap-0 sm:rounded-2xl sm:px-4 sm:py-2 ${left < 120 ? "bg-danger-ink/10 text-danger-ink" : "bg-malam/[0.05]"}`}
							>
								<span className="text-xs font-semibold">Pay within</span>
								<span
									suppressHydrationWarning
									className="font-extrabold tnum sm:text-xl"
								>
									{clock(left)}
								</span>
							</p>
						)}
					</div>
					{status === "underpaid" ? (
						<Notice
							title="Partially paid"
							body={`Only ${zec(received)} of ${zec(invoice.amount_zat)} arrived before the order closed, so it wasn't completed. Keep order number #${orderNo(invoice.id)}: ${shop?.name ?? "the shop"} can match it to your payment and send it back.`}
						/>
					) : expired ? (
						<Notice
							title="Order expired"
							body="No payment arrived in time and nothing was charged. You can place the order again."
						/>
					) : (
						<Panel
							invoice={invoice}
							uri={uri}
							usd={usd}
							status={status}
							swapStatus={swap}
							received={received}
							link={link}
							method={m}
						/>
					)}
				</section>
			)}
		</CheckoutShell>
	);
}

const orderNo = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();

function Confirmed({
	invoice,
	shop,
	lines,
	usd,
	overpaid,
	txid,
	email,
}: {
	invoice: InvoiceDetail;
	shop?: Shop;
	lines: Line[];
	usd: number | null;
	overpaid: number;
	txid: string | null;
	email?: string;
}) {
	// Move focus to the confirmation so screen readers announce it.
	const done = useRef<HTMLParagraphElement>(null);
	useEffect(() => done.current?.focus(), []);
	return (
		<div className="mx-auto flex w-full max-w-xl flex-col gap-5">
			<section
				aria-labelledby="done"
				className="relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl bg-malam px-6 pt-8 pb-7 text-center text-kertas"
			>
				<p
					id="done"
					ref={done}
					tabIndex={-1}
					className="rise outline-none flex items-center gap-2 rounded-full bg-lunas/10 px-4 py-1.5 text-sm font-bold text-lunas"
				>
					<span className="grid h-5 w-5 place-items-center rounded-full bg-lunas text-malam">
						<Icon name="check" className="h-3.5 w-3.5" />
					</span>
					Order confirmed
				</p>
				<div className="relative grid place-items-center py-2">
					<span
						aria-hidden="true"
						className="ripple absolute aspect-square w-[min(80vw,22rem)] rounded-full bg-lunas/30"
					/>
					<h1 className="stamp relative text-[clamp(4rem,16vw,7.5rem)] leading-none font-extrabold tracking-[-0.03em] text-lunas">
						LUNAS
					</h1>
				</div>
				<p className="rise text-xs text-kertas/60 [animation-delay:200ms]">
					Lunas means paid in full.
				</p>
				<p className="rise mt-2 text-3xl font-extrabold tnum [animation-delay:250ms]">
					{zec(invoice.amount_zat)}
				</p>
				<p className="h-5 text-sm text-kertas/60 tnum">
					{fiat(invoice.amount_zat, usd)}
				</p>
				{overpaid > 0 && (
					<p className="mt-2 rounded-full bg-kertas/10 px-4 py-1.5 text-sm font-semibold">
						You sent {zec(overpaid)} more than the total. Keep your order number
						to ask {shop?.name ?? "the shop"} for it back.
					</p>
				)}
			</section>
			<section className="rise flex flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-stone-200 [animation-delay:300ms] sm:p-6">
				<p className="text-sm text-stone-600">
					Thanks for your order! {shop?.name ?? "The shop"} has been paid
					{email ? (
						<>
							. A receipt would go to <b className="text-stone-900">{email}</b>{" "}
							(demo: no email is sent).
						</>
					) : (
						"."
					)}
				</p>
				<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
					<dt className="text-stone-500">Order number</dt>
					<dd className="text-right font-mono">#{orderNo(invoice.id)}</dd>
					{shop && (
						<>
							<dt className="text-stone-500">Shop</dt>
							<dd className="text-right font-semibold">{shop.name}</dd>
						</>
					)}
					<dt className="text-stone-500">Paid</dt>
					<dd className="text-right font-semibold tnum">
						{zec(invoice.amount_zat)}
					</dd>
					{txid && (
						<>
							<dt className="text-stone-500">Transaction</dt>
							<dd className="flex items-center justify-end gap-2">
								<span className="font-mono">{short(txid, 6)}</span>
								<CopyButton
									text={txid}
									what="Transaction ID"
									label="Copy transaction ID"
									className="-my-2 bg-stone-100 hover:bg-stone-200"
								/>
							</dd>
						</>
					)}
				</dl>
				{lines.length > 0 && (
					<ul className="flex flex-col gap-2 border-t border-stone-100 pt-4 text-sm">
						{lines.map((l) => (
							<li key={l.id} className="flex justify-between gap-3">
								<span className="min-w-0 truncate">
									{l.qty} × {l.name}
								</span>
								<span className="tnum">{zec(l.zat * l.qty)}</span>
							</li>
						))}
					</ul>
				)}
				<div className="grid gap-3 pt-1 sm:grid-cols-2">
					<Link to="/" className={`${mbtn.primary} min-h-14`}>
						Continue shopping
					</Link>
					{shop && (
						<Link
							to="/shop/$slug"
							params={{ slug: shop.slug }}
							className={`${mbtn.outline} min-h-14`}
						>
							View shop
						</Link>
					)}
				</div>
			</section>
		</div>
	);
}

function Notice({ title, body }: { title: string; body: string }) {
	return (
		<div className="rise flex flex-col items-center gap-4 py-6 text-center">
			<span className="grid h-14 w-14 place-items-center rounded-full bg-malam/5">
				<Icon name="alert" className="h-7 w-7" />
			</span>
			<h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
			<p className="text-malam/70">{body}</p>
			<div className="mt-2 grid w-full gap-3 sm:grid-cols-2">
				<Link to="/cart" className={btn.ink}>
					Back to cart
				</Link>
				<Link to="/" className={btn.ghostLight}>
					Continue shopping
				</Link>
			</div>
		</div>
	);
}

function Tabs({
	value,
	onChange,
}: {
	value: "zec" | "other";
	onChange: (v: "zec" | "other") => void;
}) {
	const opts = [
		{ v: "zec", label: "Zcash (shielded)" },
		{ v: "other", label: "Other crypto" },
	] as const;
	const refs = useRef<(HTMLButtonElement | null)[]>([]);
	const i = value === "zec" ? 0 : 1;
	return (
		<div
			role="tablist"
			aria-label="Payment method"
			className="relative grid grid-cols-2 rounded-2xl bg-malam/[0.06] p-1"
		>
			<span
				aria-hidden="true"
				className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-sm ring-1 ring-malam/5 transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none"
				style={{ transform: `translateX(${i * 100}%)` }}
			/>
			{opts.map((o, j) => (
				<button
					key={o.v}
					ref={(el) => {
						refs.current[j] = el;
					}}
					type="button"
					role="tab"
					id={`t-${o.v}`}
					aria-selected={value === o.v}
					aria-controls={`p-${o.v}`}
					tabIndex={value === o.v ? 0 : -1}
					onClick={() => onChange(o.v)}
					onKeyDown={(e) => {
						if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
						const next = opts[1 - j];
						onChange(next.v);
						refs.current[1 - j]?.focus();
					}}
					className={`relative min-h-12 rounded-xl text-sm font-bold transition-colors duration-150 ${value === o.v ? "text-malam" : "text-malam/55 hover:text-malam"}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

function Panel({
	invoice,
	uri,
	usd,
	status,
	swapStatus,
	received,
	link,
	method,
}: {
	invoice: InvoiceDetail;
	uri?: string;
	usd: number | null;
	status: string;
	swapStatus?: string;
	received: number;
	link: string;
	method?: "other";
}) {
	const [tab, setTab] = useState<"zec" | "other">(
		invoice.swap || method === "other" ? "other" : "zec",
	);
	const detected = status === "detected";
	const partial = detected && received > 0 && received < invoice.amount_zat;
	const swapping =
		(STEP_OF[swapStatus ?? ""] ?? 0) > 0 && !RETRY.has(swapStatus ?? "");
	const busy = detected || swapping;
	return (
		<>
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-lg font-bold">Pay with</h2>
				<p
					aria-live="polite"
					className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-300 ${busy ? "bg-malam text-kertas" : "bg-malam/[0.06]"}`}
				>
					<Dot tone={busy ? "lunas" : "malam"} />
					{detected
						? "Payment detected · confirming"
						: swapping
							? "Deposit received · swapping"
							: link === "live"
								? "Waiting for payment"
								: "Reconnecting…"}
				</p>
			</div>
			{partial && (
				<p className="rise -mt-2 text-sm text-malam/80">
					Received <b className="tnum">{zec(received)}</b> so far. Send the
					remaining <b className="tnum">{zec(invoice.amount_zat - received)}</b>{" "}
					to the same address.
				</p>
			)}
			<Tabs value={tab} onChange={setTab} />
			<div
				role="tabpanel"
				id="p-zec"
				aria-labelledby="t-zec"
				hidden={tab !== "zec"}
			>
				<ZecTab
					invoice={invoice}
					uri={uri}
					due={partial ? invoice.amount_zat - received : invoice.amount_zat}
				/>
			</div>
			<div
				role="tabpanel"
				id="p-other"
				aria-labelledby="t-other"
				hidden={tab !== "other"}
			>
				<OtherTab invoice={invoice} usd={usd} swapStatus={swapStatus} />
			</div>
		</>
	);
}

function Row({
	label,
	value,
	shown,
	what,
}: {
	label: string;
	value: string;
	shown?: string;
	what: string;
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 pl-4 ring-1 ring-malam/10">
			<div className="min-w-0">
				<p className="text-xs font-semibold text-malam/65">{label}</p>
				<p className="truncate font-mono text-sm">
					{shown ?? short(value, 12)}
				</p>
			</div>
			<CopyButton
				text={value}
				what={what}
				label={`Copy ${label.toLowerCase()}`}
				className="bg-malam/[0.06] hover:bg-malam/10"
			/>
		</div>
	);
}

function ZecTab({
	invoice,
	uri: full,
	due,
}: {
	invoice: InvoiceDetail;
	uri?: string;
	due: number;
}) {
	const amount = zec(due).replace(" ZEC", "");
	// After a partial payment, ask only for what's left.
	const uri = full?.replace(/([?&]amount=)[^&]*/, `$1${amount}`);
	const rest = due < invoice.amount_zat;
	if (!uri) {
		return (
			<p className="rounded-2xl bg-malam/5 p-4 text-sm">
				The QR code is only shown on the device that placed the order. Send the
				amount below to the address below from any Zcash wallet.
			</p>
		);
	}
	return (
		<div className="flex flex-col gap-4">
			<QrCode
				text={uri}
				alt="Zcash payment QR code"
				className="mx-auto w-full max-w-[17rem] shadow-sm ring-1 ring-malam/10"
			/>
			<p className="text-center text-sm text-malam/60">
				Scan with a Zcash wallet such as Zashi or Ywallet.
			</p>
			<a href={uri} className={`${btn.ink} text-base max-sm:order-first`}>
				<Icon name="wallet" className="h-5 w-5" />
				Open in wallet
			</a>
			<Row
				label={rest ? "Amount left to pay" : "Amount"}
				value={amount}
				shown={`${amount} ZEC`}
				what="Amount"
			/>
			{invoice.address && (
				<Row label="Address" value={invoice.address} what="Address" />
			)}
		</div>
	);
}

function OtherTab({
	invoice,
	usd,
	swapStatus,
}: {
	invoice: InvoiceDetail;
	usd: number | null;
	swapStatus?: string;
}) {
	const [assets, setAssets] = useState<SwapAsset[] | null>(null);
	const [loadErr, setLoadErr] = useState(false);
	const [assetId, setAssetId] = useState("");
	const [refund, setRefund] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [quote, setQuote] = useState<SwapInfo | null>(invoice.swap);
	// Final swap status being retried; hide it until a new status arrives.
	const [stale, setStale] = useState<string>();

	const loadAssets = () => {
		setLoadErr(false);
		getSwapAssets()
			.then(setAssets)
			.catch(() => setLoadErr(true));
	};
	// biome-ignore lint/correctness/useExhaustiveDependencies: load once per form
	useEffect(() => {
		if (!quote) loadAssets();
	}, [quote]);

	if (!quote && invoice.amount_zat < MIN_SWAP_ZAT) {
		return (
			<p className="rounded-2xl bg-malam/5 p-4 text-sm font-medium">
				Paying with other crypto needs an order of at least 0.001 ZEC. Use Zcash
				(shielded) for this one.
			</p>
		);
	}
	if (quote) {
		const cur = swapStatus ?? invoice.swap?.status;
		return (
			<Deposit
				swap={quote}
				status={cur === stale ? undefined : cur}
				onRetry={() => {
					setStale(cur);
					setQuote(null);
					setBusy(false);
				}}
			/>
		);
	}
	if (loadErr) {
		return (
			<div className="flex flex-col items-start gap-3 rounded-2xl bg-malam/5 p-4">
				<p role="alert" className="text-sm font-medium">
					Other crypto is unavailable right now.
				</p>
				<button type="button" onClick={loadAssets} className={btn.ghostLight}>
					Try again
				</button>
			</div>
		);
	}

	const asset = assets?.find((a) => a.asset_id === assetId);
	const chain = asset ? CHAINS[asset.blockchain] : undefined;
	const r = refund.trim();
	const badRefund = Boolean(chain && r && !chain.re.test(r));
	const estimate =
		asset?.price_usd && usd
			? ((invoice.amount_zat / ZAT) * usd) / asset.price_usd
			: null;
	const chains = [...new Set(assets?.map((a) => a.blockchain))].sort();

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (badRefund) return;
		setBusy(true);
		setError("");
		try {
			setQuote(
				await createSwap({
					data: { id: invoice.id, assetId, refundTo: r },
				}),
			);
		} catch (err) {
			const m = err instanceof Error ? err.message : "";
			setError(
				/refund/i.test(m)
					? `The refund address was rejected. Use a ${chain?.name ?? ""} address you control.`
					: /unavailable/i.test(m)
						? "Swaps are unavailable right now. Try again in a minute, or pay with Zcash (shielded)."
						: m || "Something went wrong. Try again.",
			);
			setBusy(false);
		}
	};
	const field =
		"min-h-14 w-full rounded-2xl bg-white px-4 text-base ring-1 ring-malam/15 transition-shadow duration-150 focus:ring-2 focus:ring-malam focus:outline-none disabled:opacity-60";

	return (
		<form onSubmit={submit} className="flex flex-col gap-5" noValidate>
			<div className="flex flex-col gap-2 text-sm font-semibold">
				<label htmlFor="asset">Asset</label>
				<span className="relative flex items-center">
					<span className="pointer-events-none absolute left-3">
						{asset ? (
							<TokenBadge symbol={asset.symbol} />
						) : (
							<span className="block h-8 w-8 rounded-full bg-malam/10" />
						)}
					</span>
					{assets ? (
						<select
							id="asset"
							required
							value={assetId}
							onChange={(e) => setAssetId(e.target.value)}
							className={`${field} appearance-none pr-10 pl-14 font-semibold`}
						>
							<option value="">Choose an asset</option>
							{chains.map((c) => (
								<optgroup key={c} label={chainName(c)}>
									{assets
										.filter((a) => a.blockchain === c)
										.map((a) => (
											<option key={a.asset_id} value={a.asset_id}>
												{a.symbol} · {chainName(c)}
											</option>
										))}
								</optgroup>
							))}
						</select>
					) : (
						<span className="skeleton block h-14 w-full rounded-2xl" />
					)}
					<svg
						viewBox="0 0 24 24"
						aria-hidden="true"
						className="pointer-events-none absolute right-4 h-5 w-5"
					>
						<path
							d="M7 10l5 5 5-5"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						/>
					</svg>
				</span>
				<span className="h-5 text-xs font-medium text-malam/60 tnum">
					{asset &&
						estimate &&
						`You'll send about ${estimate.toPrecision(4)} ${asset.symbol} on ${chainName(asset.blockchain)}, plus network fees.`}
				</span>
			</div>
			<label className="flex flex-col gap-2 text-sm font-semibold">
				Refund address
				<input
					required
					disabled={!asset}
					value={refund}
					onChange={(e) => setRefund(e.target.value)}
					autoComplete="off"
					autoCapitalize="off"
					spellCheck={false}
					aria-invalid={badRefund}
					aria-describedby="refund-hint"
					placeholder={chain ? chain.hint : "Pick an asset first"}
					className={`${field} font-mono text-sm aria-invalid:ring-2 aria-invalid:ring-danger-ink`}
				/>
				<span
					id="refund-hint"
					className={`text-xs font-medium ${badRefund ? "text-danger-ink" : "text-malam/60"}`}
				>
					{badRefund
						? `That doesn't look like a ${chain?.name} address.`
						: `If the swap can't complete, your funds return here${asset ? ` on ${chainName(asset.blockchain)}` : ""}.`}
				</span>
			</label>
			{error && (
				<p
					role="alert"
					className="rise flex items-start gap-2 rounded-2xl bg-danger-ink/10 p-3 text-sm font-medium text-danger-ink"
				>
					<Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
					{error}
				</p>
			)}
			<button
				type="submit"
				disabled={!assetId || !r || badRefund || busy}
				className={`${btn.ink} text-base`}
			>
				{busy ? (
					<>
						<span className="h-5 w-5 animate-spin rounded-full border-[3px] border-kertas/25 border-t-kertas motion-reduce:animate-none" />
						Getting a quote…
					</>
				) : (
					"Get deposit address"
				)}
			</button>
		</form>
	);
}

function Deposit({
	swap,
	status,
	onRetry,
}: {
	swap: SwapInfo;
	status?: string;
	onRetry: () => void;
}) {
	const shop = useShopName();
	const now = useNow();
	const left = Math.max(0, Math.floor((toMs(swap.deadline) - now) / 1000));
	const step = STEP_OF[status ?? "PENDING_DEPOSIT"] ?? 0;
	const problem = status ? PROBLEM[status] : undefined;
	const done = status === "SUCCESS";
	// Once the deposit is in (or failed), stop inviting another one.
	const sending = step === 0 && !problem;
	const usd = swap.amount_in_usd != null ? Number(swap.amount_in_usd) : NaN;
	return (
		<div className="rise flex flex-col gap-4">
			<div className="flex items-center gap-3 rounded-2xl bg-malam p-4 text-kertas">
				<TokenBadge symbol={swap.symbol} size="h-10 w-10" />
				<div className="min-w-0 flex-1">
					<p className="text-xs font-semibold text-kertas/60">
						{sending ? "Send exactly" : "Swap amount"} ·{" "}
						{chainName(swap.blockchain)}
					</p>
					<p className="truncate text-xl font-extrabold tnum">
						{swap.amount_in_formatted} {swap.symbol}
					</p>
					{!Number.isNaN(usd) && (
						<p className="text-xs text-kertas/60 tnum">≈ ${usd.toFixed(2)}</p>
					)}
				</div>
				{sending && (
					<CopyButton
						text={swap.amount_in_formatted}
						what="Amount"
						label="Copy amount"
						className="bg-kertas/10 hover:bg-kertas/15"
					/>
				)}
			</div>
			{sending && (
				<>
					<QrCode
						text={swap.deposit_address}
						alt={`${swap.symbol} deposit address QR code`}
						symbol={false}
						className="mx-auto w-full max-w-[13rem] ring-1 ring-malam/10"
					/>
					<Row
						label="Deposit address"
						value={swap.deposit_address}
						what="Address"
					/>
					{swap.deposit_memo && (
						<Row
							label="Memo (required)"
							value={swap.deposit_memo}
							what="Memo"
						/>
					)}
					<p className="text-sm text-malam/70">
						{left > 0 ? (
							<>
								Send within{" "}
								<b suppressHydrationWarning className="text-malam tnum">
									{clock(left)}
								</b>
							</>
						) : (
							"The deposit window has closed."
						)}
						{swap.time_estimate
							? ` · usually done in ~${swap.time_estimate}s`
							: ""}
					</p>
				</>
			)}
			{problem && (
				<div
					role="alert"
					className="rise flex flex-col gap-3 rounded-2xl bg-danger-ink/10 p-4 text-danger-ink"
				>
					<p className="flex items-start gap-2 text-sm font-semibold">
						<Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
						{problem}
					</p>
					{status && RETRY.has(status) && (
						<button type="button" onClick={onRetry} className={btn.ink}>
							Try another asset
						</button>
					)}
				</div>
			)}

			<ol className="relative flex flex-col gap-4 py-1">
				<span
					aria-hidden="true"
					className="absolute top-4 bottom-4 left-[0.6875rem] w-0.5 bg-malam/10"
				/>
				<span
					aria-hidden="true"
					className="absolute top-4 bottom-4 left-[0.6875rem] w-0.5 origin-top bg-malam transition-transform duration-500 ease-[var(--ease-in-out)] motion-reduce:transition-none"
					style={{ transform: `scaleY(${step / (STEPS.length - 1)})` }}
				/>
				{STEPS.map((s, i) => {
					const ok = i < step || done;
					const cur = i === step && !done;
					return (
						<li
							key={s}
							aria-current={cur ? "step" : undefined}
							className={`relative flex items-center gap-3 text-sm transition-opacity duration-300 ${i <= step ? "font-semibold" : "text-malam/60"}`}
						>
							<span
								className={`relative grid h-6 w-6 place-items-center rounded-full border-2 transition-colors duration-300 ${ok ? "border-malam bg-malam text-kertas" : cur ? (problem ? "border-danger-ink bg-white text-danger-ink" : "border-malam bg-white") : "border-malam/20 bg-white"}`}
							>
								{ok ? (
									<Icon name="check" className="h-3.5 w-3.5" />
								) : cur && !problem ? (
									<span className="pulse-dot h-2 w-2 rounded-full bg-malam" />
								) : null}
							</span>
							{s}
						</li>
					);
				})}
			</ol>
			<p className="rounded-2xl bg-malam/[0.04] p-3 text-xs leading-relaxed text-malam/60">
				Privacy: your {chainName(swap.blockchain)} deposit is public on that
				chain and visible to the swap solver. The payment to{" "}
				{shop ?? "the shop"} settles in shielded ZEC, so the store never sees
				your wallet.
			</p>
		</div>
	);
}

function Skeleton() {
	return (
		<CheckoutShell
			step={2}
			aside={<span className="skeleton block h-72 rounded-2xl" />}
		>
			<span className="skeleton block h-[32rem] rounded-3xl" />
		</CheckoutShell>
	);
}
