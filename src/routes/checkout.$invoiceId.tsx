import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "#/components/Logo";
import { ProductArt } from "#/components/ProductArt";
import { btn, CopyButton, Dot, Icon, QrCode, useNow } from "#/components/ui";
import { clock, fiat, short, underpaidText, ZAT, zec } from "#/lib/format";
import {
	createSwap,
	getSwapAssets,
	type InvoiceDetail,
	loadInvoice,
	type SwapAsset,
	type SwapInfo,
} from "#/lib/invoice";
import { useZecUsd } from "#/lib/price";
import { decodeCart, STORE } from "#/lib/products";
import { useInvoiceStatus } from "#/lib/useInvoiceStatus";

export const Route = createFileRoute("/checkout/$invoiceId")({
	// z: ZIP-321 URI handed over by the creator (GET /v1/invoices lacks it).
	// o: cart lines for the order summary.
	validateSearch: (s: Record<string, unknown>) => ({
		z: typeof s.z === "string" && s.z.startsWith("zcash:") ? s.z : undefined,
		o: typeof s.o === "string" ? s.o : undefined,
	}),
	loader: ({ params }) => loadInvoice({ data: { id: params.invoiceId } }),
	head: () => ({ meta: [{ title: `Pay ${STORE} · Lunaz` }] }),
	pendingComponent: Skeleton,
	component: Checkout,
});

const MIN_SWAP_ZAT = 100_000;
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

function toMs(d: number | string): number {
	const n = Number(d);
	if (!Number.isNaN(n)) return n < 1e12 ? n * 1000 : n;
	return Date.parse(String(d));
}

function Checkout() {
	const invoice = Route.useLoaderData();
	if (!invoice) {
		return (
			<main className="flex min-h-dvh flex-col p-6">
				<Logo />
				<div className="rise m-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
					<h1 className="text-4xl font-extrabold tracking-tight">
						Invoice not found
					</h1>
					<p className="text-kertas/70">
						This payment link is invalid or has been removed. Nothing was
						charged.
					</p>
					<Link to="/store" className={`${btn.lunas} mt-4`}>
						Back to store
					</Link>
				</div>
			</main>
		);
	}
	return <Page invoice={invoice} />;
}

function Footer({ light = false }: { light?: boolean }) {
	return (
		<p
			className={`flex items-center justify-center gap-1.5 text-xs font-medium ${light ? "text-malam/50" : "text-kertas/50"}`}
		>
			<Icon name="lock" className="h-3.5 w-3.5" />
			Secured by Lunaz · non-custodial
		</p>
	);
}

function Page({ invoice }: { invoice: InvoiceDetail }) {
	const { z, o } = Route.useSearch();
	const { status, swap, received, overpaid, link } = useInvoiceStatus(
		invoice.id,
		invoice.status,
	);
	const usd = useZecUsd();
	const now = useNow();
	const left = Math.max(0, Math.floor(invoice.expires_at - now / 1000));
	const expired = status === "expired" || (status === "pending" && left === 0);
	const uri = invoice.zip321_uri ?? z;
	const cart = decodeCart(o);
	const lines = (
		<ul className="flex flex-col gap-4">
			{cart.map((l) => (
				<li key={l.id} className="flex items-center gap-3">
					<span
						style={{ background: l.tint }}
						className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
					>
						<ProductArt id={l.id} className="h-10 w-10" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-semibold">
							{l.name}
						</span>
						<span className="block text-xs text-kertas/50">Qty {l.qty}</span>
					</span>
					<span className="text-sm font-semibold tnum">
						{zec(l.zat * l.qty)}
					</span>
				</li>
			))}
		</ul>
	);

	if (status === "paid") {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10 text-center">
				<p className="rise flex items-center gap-2 rounded-full bg-lunas/10 px-4 py-2 text-sm font-bold text-lunas">
					<span className="grid h-5 w-5 place-items-center rounded-full bg-lunas text-malam">
						<Icon name="check" className="h-3.5 w-3.5" />
					</span>
					Payment received
				</p>
				<div className="relative grid place-items-center">
					<span
						aria-hidden="true"
						className="ripple absolute aspect-square w-[min(90vw,32rem)] rounded-full bg-lunas/30"
					/>
					<h1 className="stamp relative text-[clamp(4.5rem,20vw,11rem)] leading-none font-extrabold tracking-[-0.03em] text-lunas">
						LUNAS
					</h1>
				</div>
				<div className="rise flex flex-col items-center gap-1 [animation-delay:250ms]">
					<p className="text-3xl font-extrabold tnum">
						{zec(invoice.amount_zat)}
					</p>
					<p className="h-6 text-kertas/60 tnum">
						{fiat(invoice.amount_zat, usd)}
					</p>
					{overpaid > 0 && (
						<p className="mt-2 rounded-full bg-kertas/10 px-4 py-1.5 text-sm font-semibold">
							Overpaid by {zec(overpaid)}. {STORE} will refund the difference.
						</p>
					)}
					<p className="mt-3 max-w-sm text-kertas/70">
						Payment received by {STORE}. Thank you for your order!
					</p>
				</div>
				<Link
					to="/store"
					className={`${btn.lunas} rise mt-2 min-w-64 text-lg [animation-delay:400ms]`}
				>
					Return to store
				</Link>
				<div className="mt-6">
					<Footer />
				</div>
			</main>
		);
	}

	return (
		<div className="grid min-h-dvh lg:grid-cols-2">
			<section className="px-5 pt-6 pb-8 sm:px-10 lg:flex lg:justify-end lg:py-16">
				<div className="flex w-full max-w-md flex-col gap-6 lg:mr-6">
					<Link
						to="/store"
						className="press -ml-2 flex min-h-11 items-center gap-1 self-start rounded-xl px-2 text-sm font-semibold text-kertas/70 hover:text-kertas"
					>
						<Icon name="back" className="h-4 w-4" />
						{STORE}
					</Link>
					<div>
						<p className="font-medium text-kertas/60">Pay {STORE}</p>
						<p className="mt-1 text-4xl font-extrabold tracking-tight tnum sm:text-5xl">
							{zec(invoice.amount_zat)}
						</p>
						<p className="mt-1 h-6 text-kertas/60 tnum">
							{fiat(invoice.amount_zat, usd)}
						</p>
					</div>
					{cart.length > 0 && (
						<>
							<details className="group rounded-2xl bg-kertas/[0.06] lg:hidden">
								<summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold">
									Order summary · {cart.reduce((t, l) => t + l.qty, 0)} items
									<Icon
										name="back"
										className="h-4 w-4 -rotate-90 transition-transform duration-200 group-open:rotate-90"
									/>
								</summary>
								<div className="px-4 pb-4">{lines}</div>
							</details>
							<div className="hidden lg:block">{lines}</div>
						</>
					)}
					<dl className="flex flex-col text-sm">
						<div className="hidden justify-between gap-4 border-t border-kertas/10 py-3 lg:flex">
							<dt className="text-kertas/60">Invoice</dt>
							<dd className="font-mono">{short(invoice.id, 6)}</dd>
						</div>
						<div className="flex justify-between gap-4 border-t border-kertas/10 py-3">
							<dt className="text-kertas/60">Expires in</dt>
							<dd
								suppressHydrationWarning
								className={`font-semibold tnum ${!expired && left < 120 ? "text-danger" : ""}`}
							>
								{expired ? "Expired" : clock(left)}
							</dd>
						</div>
						<div className="flex justify-between gap-4 border-t border-kertas/10 py-3 font-bold">
							<dt>Total due</dt>
							<dd className="tnum">{zec(invoice.amount_zat)}</dd>
						</div>
					</dl>
					<div className="hidden lg:mt-auto lg:block">
						<Logo />
					</div>
				</div>
			</section>

			<section className="on-light bg-kertas px-5 pt-8 pb-8 text-malam sm:px-10 lg:py-16 lg:shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.5)]">
				<div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:mx-0 lg:ml-6">
					{status === "underpaid" ? (
						<Notice
							title="Partially paid"
							body={underpaidText(received, invoice.amount_zat)}
						/>
					) : expired ? (
						<Notice
							title="Invoice expired"
							body="No payment arrived in time and nothing was charged. Return to the store to start again."
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
						/>
					)}
					<Footer light />
				</div>
			</section>
		</div>
	);
}

function Notice({ title, body }: { title: string; body: string }) {
	return (
		<div className="rise flex flex-col items-center gap-4 py-10 text-center">
			<span className="grid h-14 w-14 place-items-center rounded-full bg-malam/5">
				<Icon name="alert" className="h-7 w-7" />
			</span>
			<h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
			<p className="text-malam/70">{body}</p>
			<Link to="/store" className={`${btn.ink} mt-2 min-w-56`}>
				Return to store
			</Link>
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
		{ v: "zec", label: "Zcash" },
		{ v: "other", label: "Other assets" },
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
}: {
	invoice: InvoiceDetail;
	uri?: string;
	usd: number | null;
	status: string;
	swapStatus?: string;
	received: number;
	link: string;
}) {
	const [tab, setTab] = useState<"zec" | "other">(
		invoice.swap ? "other" : "zec",
	);
	const detected = status === "detected";
	const partial = detected && received > 0 && received < invoice.amount_zat;
	return (
		<>
			<div className="flex items-center justify-between gap-3">
				<h1 className="text-xl font-bold">Pay with</h1>
				<p
					aria-live="polite"
					className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-300 ${detected ? "bg-malam text-kertas" : "bg-malam/[0.06]"}`}
				>
					<Dot tone={detected ? "lunas" : "malam"} />
					{detected
						? "Payment detected · confirming"
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
				<ZecTab invoice={invoice} uri={uri} />
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
				<p className="text-xs font-semibold text-malam/50">{label}</p>
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

function ZecTab({ invoice, uri }: { invoice: InvoiceDetail; uri?: string }) {
	if (!uri) {
		return (
			<p className="rounded-2xl bg-malam/5 p-4 text-sm">
				Open this checkout from the store to get a payment QR code.
			</p>
		);
	}
	const amount = zec(invoice.amount_zat).replace(" ZEC", "");
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
			<a href={uri} className={`${btn.ink} text-base`}>
				<Icon name="wallet" className="h-5 w-5" />
				Open in wallet
			</a>
			<Row
				label="Amount"
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
				Paying with other assets needs an order of at least 0.001 ZEC. Use the
				Zcash tab for this one.
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
					Other assets are unavailable right now.
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
							className={`relative flex items-center gap-3 text-sm transition-opacity duration-300 ${i <= step ? "font-semibold" : "text-malam/45"}`}
						>
							<span
								className={`relative grid h-6 w-6 place-items-center rounded-full border-2 transition-colors duration-300 ${ok ? "border-malam bg-malam text-kertas" : cur ? (problem ? "border-danger-ink bg-kertas text-danger-ink" : "border-malam bg-kertas") : "border-malam/20 bg-kertas"}`}
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
				chain and visible to the swap solver. The payment to {STORE} settles in
				shielded ZEC, so the store never sees your wallet.
			</p>
		</div>
	);
}

function Skeleton() {
	return (
		<div className="grid min-h-dvh lg:grid-cols-2">
			<section className="flex flex-col gap-4 px-5 pt-16 sm:px-10 lg:items-end">
				<div className="flex w-full max-w-md flex-col gap-4 lg:mr-6">
					<span className="skeleton h-4 w-32 rounded" />
					<span className="skeleton h-12 w-56 rounded-lg" />
					<span className="skeleton h-24 w-full rounded-2xl" />
				</div>
			</section>
			<section className="bg-kertas px-5 pt-16 text-malam sm:px-10">
				<div className="flex w-full max-w-md flex-col gap-4 lg:ml-6">
					<span className="skeleton h-12 w-full rounded-2xl" />
					<span className="skeleton mx-auto aspect-square w-full max-w-[17rem] rounded-2xl" />
					<span className="skeleton h-14 w-full rounded-2xl" />
				</div>
			</section>
		</div>
	);
}
