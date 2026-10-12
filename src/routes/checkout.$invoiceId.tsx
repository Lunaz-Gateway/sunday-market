import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Logo } from "#/components/Logo";
import { partialText, short, underpaidText, zec } from "#/lib/format";
import {
	createSwap,
	getSwapAssets,
	type InvoiceDetail,
	loadInvoice,
	type SwapAsset,
	type SwapInfo,
} from "#/lib/invoice";
import { useInvoiceStatus } from "#/lib/useInvoiceStatus";

export const Route = createFileRoute("/checkout/$invoiceId")({
	// z: ZIP-321 URI handed over by the creator (GET /v1/invoices lacks it).
	validateSearch: (s: Record<string, unknown>) => ({
		z: typeof s.z === "string" && s.z.startsWith("zcash:") ? s.z : undefined,
	}),
	loader: ({ params }) => loadInvoice({ data: { id: params.invoiceId } }),
	head: () => ({ meta: [{ title: "Pay with Lunaz" }] }),
	component: Checkout,
});

const MIN_SWAP_ZAT = 100_000;
const STORE = "Kedai Kopi Online";
const STEPS = [
	"Waiting for deposit",
	"Deposit seen",
	"Swapping",
	"Delivered to shielded ZEC",
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
		"The swap could not complete and your funds were refunded to your refund address.",
	FAILED: "The swap failed. Any deposit is returned to your refund address.",
	INCOMPLETE_DEPOSIT:
		"The deposit was less than required and will be refunded. The invoice is still open: try another asset or pay with ZEC.",
};

function toMs(d: number | string): number {
	const n = Number(d);
	if (!Number.isNaN(n)) return n < 1e12 ? n * 1000 : n;
	return Date.parse(String(d));
}

function useQr(text: string | undefined) {
	const [qr, setQr] = useState("");
	useEffect(() => {
		if (!text) return;
		QRCode.toDataURL(text, {
			width: 640,
			margin: 1,
			color: { dark: "#1C1F3D", light: "#F6F2E9" },
		}).then(setQr);
	}, [text]);
	return qr;
}

function useNow() {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, []);
	return now;
}

const clock = (secs: number) =>
	`${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

function Checkout() {
	const invoice = Route.useLoaderData();
	if (!invoice) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
				<h1 className="text-4xl font-bold">Invoice not found</h1>
				<p className="opacity-70">
					This payment link is invalid or has been removed.
				</p>
				<Link
					to="/store"
					className="rounded-2xl bg-kertas px-8 py-3 font-bold text-malam"
				>
					Back to store
				</Link>
			</main>
		);
	}
	return <Page invoice={invoice} />;
}

function Page({ invoice }: { invoice: InvoiceDetail }) {
	const { z } = Route.useSearch();
	const { status, swap, received, overpaid } = useInvoiceStatus(
		invoice.id,
		invoice.status,
	);
	const now = useNow();
	const left = Math.max(0, Math.floor(invoice.expires_at - now / 1000));
	const expired = status === "expired" || (status === "pending" && left === 0);
	const uri = invoice.zip321_uri ?? z;

	if (status === "paid") {
		return (
			<main className="rise flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
				<h1 className="text-[clamp(5rem,22vw,16rem)] leading-none font-extrabold tracking-tight text-lunas">
					LUNAS
				</h1>
				<p className="text-3xl font-bold">{zec(invoice.amount_zat)}</p>
				{overpaid > 0 && (
					<p className="text-sm opacity-70">Overpaid by {zec(overpaid)}</p>
				)}
				<p className="opacity-70">Paid to {STORE}. Thank you!</p>
				<Link
					to="/store"
					className="mt-4 rounded-2xl bg-lunas px-10 py-4 text-xl font-bold text-malam"
				>
					Back to store
				</Link>
			</main>
		);
	}

	if (status === "underpaid") {
		return (
			<main className="rise flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
				<h1 className="text-5xl font-bold">Partially paid</h1>
				<p className="max-w-md opacity-70">
					{underpaidText(received, invoice.amount_zat)}
				</p>
				<Link
					to="/store"
					className="rounded-2xl bg-kertas px-8 py-3 font-bold text-malam"
				>
					Back to store
				</Link>
			</main>
		);
	}

	return (
		<main className="mx-auto grid min-h-screen w-full max-w-5xl gap-8 p-6 content-start md:grid-cols-2 md:items-start md:gap-16 md:py-16">
			<section className="flex flex-col gap-6">
				<div className="self-start">
					<Logo />
				</div>
				<div>
					<p className="text-sm font-medium opacity-70">Pay {STORE}</p>
					<p className="text-5xl font-bold tabular-nums">
						{zec(invoice.amount_zat)}
					</p>
				</div>
				<dl className="flex flex-col gap-1 text-sm opacity-80">
					<div className="flex justify-between gap-4 border-t border-kertas/20 py-2">
						<dt>Invoice</dt>
						<dd className="font-mono">{short(invoice.id, 6)}</dd>
					</div>
					{!expired && (
						<div className="flex justify-between gap-4 border-t border-kertas/20 py-2">
							<dt>Expires in</dt>
							<dd className="tabular-nums">{clock(left)}</dd>
						</div>
					)}
				</dl>
				<Link
					to="/store"
					className="text-sm underline underline-offset-4 opacity-80"
				>
					Back to store
				</Link>
			</section>
			<section className="rounded-3xl bg-kertas p-5 text-malam md:p-8">
				{expired ? (
					<div className="flex flex-col gap-3 py-8 text-center">
						<h1 className="text-3xl font-bold">Invoice expired</h1>
						<p className="opacity-70">
							No payment was received in time. Return to the store to start
							again.
						</p>
					</div>
				) : (
					<Panel
						invoice={invoice}
						uri={uri}
						status={status}
						swapStatus={swap}
						partial={
							status === "detected" && received < invoice.amount_zat
								? partialText(received, invoice.amount_zat)
								: undefined
						}
					/>
				)}
			</section>
		</main>
	);
}

function Panel({
	invoice,
	uri,
	status,
	swapStatus,
	partial,
}: {
	invoice: InvoiceDetail;
	uri?: string;
	status: string;
	swapStatus?: string;
	partial?: string;
}) {
	const [tab, setTab] = useState<"zec" | "other">(
		invoice.swap ? "other" : "zec",
	);
	const tabCls = (on: boolean) =>
		`flex-1 rounded-full px-4 py-2 text-sm font-bold ${on ? "bg-malam text-kertas" : "text-malam"}`;
	return (
		<div className="flex flex-col gap-6">
			<div
				role="tablist"
				className="flex gap-1 rounded-full border border-malam/20 p-1"
			>
				<button
					type="button"
					role="tab"
					id="t-zec"
					aria-selected={tab === "zec"}
					aria-controls="p-zec"
					onClick={() => setTab("zec")}
					className={tabCls(tab === "zec")}
				>
					Zcash
				</button>
				<button
					type="button"
					role="tab"
					id="t-other"
					aria-selected={tab === "other"}
					aria-controls="p-other"
					onClick={() => setTab("other")}
					className={tabCls(tab === "other")}
				>
					Other assets
				</button>
			</div>
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
				<OtherTab invoice={invoice} swapStatus={swapStatus} />
			</div>
			<output className="flex items-center gap-3 rounded-full border border-malam/20 px-5 py-2 text-sm font-medium">
				<span className="pulse-dot h-2.5 w-2.5 rounded-full bg-malam" />
				{status === "detected"
					? "Payment detected, waiting for confirmation"
					: "Waiting for payment"}
			</output>
			{partial && <p className="text-sm font-medium">{partial}</p>}
		</div>
	);
}

function Copy({ text, label }: { text: string; label: string }) {
	const [done, setDone] = useState(false);
	return (
		<button
			type="button"
			aria-label={label}
			onClick={() => {
				navigator.clipboard?.writeText(text).then(() => {
					setDone(true);
					setTimeout(() => setDone(false), 1500);
				});
			}}
			className="shrink-0 rounded-full border border-malam/30 px-3 py-1 text-xs font-bold"
		>
			{done ? "Copied" : "Copy"}
		</button>
	);
}

function Qr({ text, alt }: { text: string; alt: string }) {
	const qr = useQr(text);
	return (
		<div className="mx-auto aspect-square w-full max-w-60">
			{qr && <img src={qr} alt={alt} className="h-full w-full rounded-xl" />}
		</div>
	);
}

function AddressRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-xl border border-malam/15 p-3">
			<div className="min-w-0">
				<p className="text-xs font-medium opacity-60">{label}</p>
				<p className="font-mono text-sm break-all">{short(value, 12)}</p>
			</div>
			<Copy text={value} label={`Copy ${label}`} />
		</div>
	);
}

function ZecTab({ invoice, uri }: { invoice: InvoiceDetail; uri?: string }) {
	if (!uri) {
		return (
			<p className="text-sm">
				Open this checkout from the store to get a payment QR.
			</p>
		);
	}
	return (
		<div className="flex flex-col gap-4">
			<Qr text={uri} alt="Zcash payment QR code" />
			<a
				href={uri}
				className="rounded-2xl bg-malam py-3 text-center font-bold text-kertas"
			>
				Open in wallet
			</a>
			{invoice.address && (
				<AddressRow label="Address" value={invoice.address} />
			)}
		</div>
	);
}

function OtherTab({
	invoice,
	swapStatus,
}: {
	invoice: InvoiceDetail;
	swapStatus?: string;
}) {
	const [assets, setAssets] = useState<SwapAsset[] | null>(null);
	const [loadErr, setLoadErr] = useState("");
	const [assetId, setAssetId] = useState("");
	const [refund, setRefund] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [quote, setQuote] = useState<SwapInfo | null>(invoice.swap);
	// Final swap status being retried; hide it until a new status arrives.
	const [stale, setStale] = useState<string>();

	useEffect(() => {
		if (quote) return;
		getSwapAssets()
			.then(setAssets)
			.catch(() => setLoadErr("Other assets are unavailable right now."));
	}, [quote]);

	if (!quote && invoice.amount_zat < MIN_SWAP_ZAT) {
		return (
			<p className="text-sm font-medium">
				Cross-chain payments need at least 0.001 ZEC.
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

	const chains = [...new Set(assets?.map((a) => a.blockchain))].sort();
	const chain = assets?.find((a) => a.asset_id === assetId)?.blockchain;
	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setError("");
		try {
			setQuote(
				await createSwap({
					data: { id: invoice.id, assetId, refundTo: refund.trim() },
				}),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
			setBusy(false);
		}
	};
	const field =
		"w-full rounded-xl border border-malam/30 bg-white px-3 py-2 text-sm";

	return (
		<form onSubmit={submit} className="flex flex-col gap-4">
			{loadErr ? (
				<p role="alert" className="text-sm">
					{loadErr}
				</p>
			) : (
				<>
					<label className="flex flex-col gap-1 text-sm font-medium">
						Pay with
						<select
							required
							value={assetId}
							onChange={(e) => setAssetId(e.target.value)}
							disabled={!assets}
							className={field}
						>
							<option value="">
								{assets ? "Choose an asset" : "Loading…"}
							</option>
							{chains.map((c) => (
								<optgroup key={c} label={c}>
									{assets
										?.filter((a) => a.blockchain === c)
										.map((a) => (
											<option key={a.asset_id} value={a.asset_id}>
												{a.symbol} on {c}
											</option>
										))}
								</optgroup>
							))}
						</select>
					</label>
					<label className="flex flex-col gap-1 text-sm font-medium">
						Refund address
						<input
							required
							value={refund}
							onChange={(e) => setRefund(e.target.value)}
							autoComplete="off"
							spellCheck={false}
							className={`${field} font-mono`}
						/>
						<span className="text-xs font-normal opacity-70">
							If the swap fails, funds return here. Use an address on{" "}
							{chain ?? "the same chain"}.
						</span>
					</label>
					{error && (
						<p role="alert" className="text-sm font-medium text-red-700">
							{error}
						</p>
					)}
					<button
						type="submit"
						disabled={!assetId || !refund.trim() || busy}
						className="rounded-2xl bg-malam py-3 font-bold text-kertas disabled:opacity-40"
					>
						{busy ? "Getting address…" : "Get deposit address"}
					</button>
				</>
			)}
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
	const usd = swap.amount_in_usd != null ? Number(swap.amount_in_usd) : NaN;
	return (
		<div className="flex flex-col gap-4">
			<div>
				<p className="text-sm font-medium opacity-70">You send</p>
				<p className="text-2xl font-bold tabular-nums">
					{swap.amount_in_formatted} {swap.symbol}{" "}
					<span className="text-sm font-medium opacity-70">
						on {swap.blockchain}
					</span>
				</p>
				{!Number.isNaN(usd) && (
					<p className="text-sm opacity-70">≈ ${usd.toFixed(2)} USD</p>
				)}
			</div>
			<Qr
				text={swap.deposit_address}
				alt={`${swap.symbol} deposit address QR code`}
			/>
			<AddressRow label="Deposit address" value={swap.deposit_address} />
			{swap.deposit_memo && (
				<AddressRow label="Memo (required)" value={swap.deposit_memo} />
			)}
			<p className="text-sm">
				{left > 0 ? (
					<>
						Send before the deadline:{" "}
						<b className="tabular-nums">{clock(left)}</b>
					</>
				) : (
					"The deposit deadline has passed."
				)}
				{swap.time_estimate ? (
					<span className="opacity-70">
						{" "}
						· about {swap.time_estimate}s to complete
					</span>
				) : null}
			</p>
			{problem && (
				<p
					role="alert"
					className="rounded-xl border border-malam/30 p-3 text-sm font-medium"
				>
					{problem}
				</p>
			)}
			{status && RETRY.has(status) && (
				<button
					type="button"
					onClick={onRetry}
					className="rounded-2xl bg-malam py-3 font-bold text-kertas"
				>
					Try another asset
				</button>
			)}
			<ol className="flex flex-col gap-2 text-sm">
				{STEPS.map((s, i) => (
					<li
						key={s}
						aria-current={i === step ? "step" : undefined}
						className={`flex items-center gap-3 ${i <= step ? "font-bold" : "opacity-50"}`}
					>
						<span
							className={`flex h-5 w-5 items-center justify-center rounded-full border border-malam text-xs ${i < step || status === "SUCCESS" ? "bg-malam text-kertas" : ""} ${i === step ? "pulse-dot" : ""}`}
						>
							{i < step || status === "SUCCESS" ? "✓" : i + 1}
						</span>
						{s}
					</li>
				))}
			</ol>
			<p className="text-xs opacity-70">
				Your deposit on {swap.blockchain} is public; the payment to the store is
				shielded.
			</p>
		</div>
	);
}
