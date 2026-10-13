import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "#/components/Logo";
import { btn, Dot, Icon, QrCode, useNow } from "#/components/ui";
import { shopOf } from "#/lib/catalog";
import { clock, fiat, short, ZAT, zec } from "#/lib/format";
import {
	createInvoice,
	getInvoice,
	getPosShop,
	type Invoice,
} from "#/lib/invoice";
import { useZecUsd } from "#/lib/price";
import { useInvoiceStatus } from "#/lib/useInvoiceStatus";

export const Route = createFileRoute("/pos")({
	loader: () => getPosShop(),
	head: () => ({ meta: [{ title: "Lunaz Cashier" }] }),
	component: Cashier,
});

const QUICK = ["0.001", "0.005", "0.01", "0.05", "0.1"];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "<"];
const MAX_WHOLE = 4;
const MAX_FRAC = 8;
const AUTO_RETURN_S = 20;

function toZat(amount: string) {
	const [whole, frac = ""] = amount.split(".");
	return Number(whole || "0") * ZAT + Number(frac.padEnd(8, "0"));
}

// Applies one key; returns the input unchanged when the result would be invalid.
function applyKey(a: string, k: string) {
	if (k === "<") return a.slice(0, -1);
	const [whole, frac] = a.split(".");
	if (k === ".") return frac === undefined ? `${a || "0"}.` : a;
	if (frac !== undefined) return frac.length < MAX_FRAC ? a + k : a;
	if (a === "0") return k;
	return whole.length < MAX_WHOLE ? a + k : a;
}

function readSound() {
	try {
		return localStorage.getItem("lunaz.sound") === "1";
	} catch {
		return false;
	}
}

function chime() {
	const Ctx =
		window.AudioContext ??
		(window as unknown as { webkitAudioContext?: typeof AudioContext })
			.webkitAudioContext;
	if (!Ctx) return;
	const ac = new Ctx();
	const t = ac.currentTime;
	for (const [f, d] of [
		[880, 0],
		[1318.5, 0.11],
	]) {
		const o = ac.createOscillator();
		const g = ac.createGain();
		o.type = "sine";
		o.frequency.value = f;
		g.gain.setValueAtTime(0.0001, t + d);
		g.gain.exponentialRampToValueAtTime(0.2, t + d + 0.02);
		g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.7);
		o.connect(g).connect(ac.destination);
		o.start(t + d);
		o.stop(t + d + 0.75);
	}
	setTimeout(() => ac.close(), 1200);
}

function useFullscreen() {
	const [on, setOn] = useState(false);
	const [can, setCan] = useState(false);
	useEffect(() => {
		setCan(Boolean(document.fullscreenEnabled));
		const f = () => setOn(Boolean(document.fullscreenElement));
		document.addEventListener("fullscreenchange", f);
		return () => document.removeEventListener("fullscreenchange", f);
	}, []);
	const toggle = () =>
		(document.fullscreenElement
			? document.exitFullscreen()
			: document.documentElement.requestFullscreen()
		).catch(() => {});
	return { can, on, toggle };
}

// Keeps the screen awake while an invoice is on display.
function useWakeLock() {
	useEffect(() => {
		if (!("wakeLock" in navigator)) return;
		let lock: WakeLockSentinel | undefined;
		let gone = false;
		const take = () => {
			if (document.visibilityState !== "visible") return;
			navigator.wakeLock
				.request("screen")
				.then((l) => {
					if (gone) l.release();
					else lock = l;
				})
				.catch(() => {});
		};
		take();
		document.addEventListener("visibilitychange", take);
		return () => {
			gone = true;
			document.removeEventListener("visibilitychange", take);
			lock?.release().catch(() => {});
		};
	}, []);
}

function Cashier() {
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [draft, setDraft] = useState("");
	const [sound, setSound] = useState(false);
	const usd = useZecUsd();
	useEffect(() => setSound(readSound()), []);

	const toggleSound = () => {
		const next = !sound;
		setSound(next);
		try {
			localStorage.setItem("lunaz.sound", next ? "1" : "0");
		} catch {}
		if (next) chime();
	};

	return (
		<main className="flex min-h-dvh flex-col">
			<TopBar sound={sound} onSound={toggleSound} />
			{invoice ? (
				<InvoiceView
					key={invoice.id}
					invoice={invoice}
					usd={usd}
					sound={sound}
					onDone={(keep) => {
						setDraft(keep ? zec(invoice.amount_zat).replace(" ZEC", "") : "");
						setInvoice(null);
					}}
				/>
			) : (
				<Entry initial={draft} usd={usd} onCreated={setInvoice} />
			)}
		</main>
	);
}

function TopBar({ sound, onSound }: { sound: boolean; onSound: () => void }) {
	const fs = useFullscreen();
	const shop = shopOf(Route.useLoaderData() ?? "");
	const tool =
		"press flex h-14 w-14 items-center justify-center rounded-2xl text-kertas/80 hover:bg-kertas/5 active:bg-kertas/10";
	return (
		<header className="flex items-center justify-between gap-4 px-4 pt-4 sm:px-6">
			<div className="flex min-w-0 items-center gap-4">
				<Logo className="h-auto w-28 shrink-0 sm:w-32" />
				{shop && (
					<p className="hidden min-w-0 border-l border-kertas/15 pl-4 text-sm sm:block">
						<span className="block text-kertas/50">Charging for</span>
						<span className="block truncate font-bold">{shop.name}</span>
					</p>
				)}
			</div>
			<div className="flex items-center gap-1">
				{fs.can && (
					<button
						type="button"
						onClick={fs.toggle}
						aria-label={fs.on ? "Exit full screen" : "Enter full screen"}
						className={tool}
					>
						<Icon name={fs.on ? "shrink" : "expand"} className="h-6 w-6" />
					</button>
				)}
				<button
					type="button"
					popoverTarget="settings"
					aria-label="Settings"
					className={tool}
				>
					<Icon name="gear" className="h-6 w-6" />
				</button>
				<div
					id="settings"
					popover="auto"
					className="inset-auto top-20 right-4 m-0 w-72 rounded-2xl border border-kertas/10 bg-malam-2 p-2 text-kertas shadow-2xl shadow-black/40 sm:right-6"
				>
					<button
						type="button"
						role="switch"
						aria-checked={sound}
						onClick={onSound}
						className="press flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-kertas/5"
					>
						<Icon name="sound" className="h-5 w-5 text-kertas/70" />
						<span className="flex-1 font-semibold">Success sound</span>
						<span
							className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${sound ? "bg-lunas" : "bg-kertas/20"}`}
						>
							<span
								className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-malam shadow transition-transform duration-200 ease-[var(--ease-out)] ${sound ? "translate-x-5" : ""}`}
							/>
						</span>
					</button>
					{shop && (
						<p className="px-3 pt-2 pb-1 text-xs text-kertas/50 sm:hidden">
							Charging for <b className="text-kertas">{shop.name}</b>
						</p>
					)}
					<Link
						to="/"
						className="flex min-h-14 items-center gap-3 rounded-xl px-3 font-semibold hover:bg-kertas/5"
					>
						<Icon name="cart" className="h-5 w-5 text-kertas/70" />
						Open marketplace
					</Link>
				</div>
			</div>
		</header>
	);
}

function Entry({
	initial,
	usd,
	onCreated,
}: {
	initial: string;
	usd: number | null;
	onCreated: (i: Invoice) => void;
}) {
	const [amount, setAmount] = useState(initial);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const zat = toZat(amount);

	const press = useCallback((k: string) => {
		setError("");
		setAmount((a) => applyKey(a, k));
	}, []);

	const charge = async () => {
		if (zat <= 0 || busy) return;
		setBusy(true);
		setError("");
		try {
			onCreated(await createInvoice({ data: { amountZat: zat } }));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
			setBusy(false);
		}
	};
	const chargeRef = useRef(charge);
	chargeRef.current = charge;

	// Hardware keyboard for desk setups.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (/^[0-9]$/.test(e.key)) press(e.key);
			else if (e.key === "." || e.key === ",") press(".");
			else if (e.key === "Backspace") press("<");
			else if (e.key === "Escape") setAmount("");
			else if (e.key === "Enter") chargeRef.current();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [press]);

	const shown = amount || "0";
	const size =
		shown.length > 11
			? "text-5xl sm:text-6xl"
			: shown.length > 8
				? "text-6xl sm:text-7xl"
				: "text-7xl sm:text-8xl";

	return (
		<section className="rise mx-auto grid w-full max-w-6xl flex-1 content-center gap-8 px-4 py-6 sm:px-6 md:grid-cols-[1fr_minmax(0,26rem)] md:gap-12 lg:gap-20">
			<div className="flex min-w-0 flex-col justify-center gap-6">
				<div>
					<div className="flex items-center justify-between gap-4">
						<p className="text-sm font-semibold tracking-wide text-kertas/60 uppercase">
							Amount
						</p>
						{amount && (
							<button
								type="button"
								onClick={() => setAmount("")}
								className="press -my-3 min-h-11 rounded-xl px-3 text-sm font-semibold text-kertas/60 hover:text-kertas"
							>
								Clear
							</button>
						)}
					</div>
					<p
						className={`mt-2 flex items-baseline gap-3 leading-none font-extrabold tracking-tight tnum ${size}`}
						aria-live="polite"
					>
						<span className={amount ? "" : "text-kertas/30"}>{shown}</span>
						<span className="text-2xl font-bold tracking-normal text-kertas/50 sm:text-3xl">
							ZEC
						</span>
					</p>
					<p className="mt-3 h-7 text-xl font-medium text-kertas/60 tnum">
						{zat > 0 && fiat(zat, usd)}
					</p>
				</div>
				<div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
					{QUICK.map((q) => (
						<button
							key={q}
							type="button"
							onClick={() => {
								setError("");
								setAmount(q);
							}}
							aria-pressed={amount === q}
							className={`press min-h-14 rounded-2xl border px-1 text-base sm:px-5 sm:text-lg font-semibold tnum ${amount === q ? "border-lunas bg-lunas/10 text-lunas" : "border-kertas/15 hover:bg-kertas/5 active:bg-kertas/10"}`}
						>
							{q}
						</button>
					))}
				</div>
				{error && (
					<div
						role="alert"
						className="rise flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-danger"
					>
						<Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
						<p className="font-medium">{error}</p>
					</div>
				)}
			</div>
			<div className="flex flex-col gap-3">
				<div className="grid grid-cols-3 gap-3">
					{KEYS.map((k) => (
						<button
							key={k}
							type="button"
							onClick={() => press(k)}
							aria-label={
								k === "<" ? "Backspace" : k === "." ? "Decimal point" : k
							}
							className="press flex min-h-[4.5rem] items-center justify-center rounded-2xl bg-kertas/[0.07] text-3xl font-bold hover:bg-kertas/10 active:bg-kertas/15 sm:min-h-20"
						>
							{k === "<" ? (
								<Icon name="del" className="h-8 w-8" />
							) : k === "." ? (
								"."
							) : (
								k
							)}
						</button>
					))}
				</div>
				<button
					type="button"
					disabled={zat <= 0 || busy}
					onClick={charge}
					className={`${btn.lunas} min-h-20 text-2xl`}
				>
					{busy ? (
						<>
							<span className="h-5 w-5 animate-spin rounded-full border-[3px] border-malam/25 border-t-malam motion-reduce:animate-none" />
							Creating invoice…
						</>
					) : zat > 0 ? (
						`Charge ${amount.replace(/\.$/, "")} ZEC`
					) : (
						"Enter an amount"
					)}
				</button>
			</div>
		</section>
	);
}

function InvoiceView({
	invoice,
	usd,
	sound,
	onDone,
}: {
	invoice: Invoice;
	usd: number | null;
	sound: boolean;
	onDone: (keepAmount?: boolean) => void;
}) {
	const { status, received, overpaid, link } = useInvoiceStatus(invoice.id);
	const pos = Route.useLoaderData();
	const now = useNow() / 1000;
	const [start] = useState(() => Date.now() / 1000);
	const [txid, setTxid] = useState<string | null>(null);
	useWakeLock();

	const soundRef = useRef(sound);
	soundRef.current = sound;
	useEffect(() => {
		if (status !== "paid") return;
		if (soundRef.current) chime();
		getInvoice({ data: { id: invoice.id } })
			.then((i) => setTxid(i.txid))
			.catch(() => {});
	}, [status, invoice.id]);

	const left = Math.max(0, Math.floor(invoice.expires_at - now));
	const total = Math.max(1, invoice.expires_at - start);
	const expired = status === "expired" || (status === "pending" && left === 0);

	if (status === "paid") {
		return (
			<Paid
				invoice={invoice}
				usd={usd}
				overpaid={overpaid}
				txid={txid}
				onDone={() => onDone()}
			/>
		);
	}
	if (status === "underpaid") {
		return (
			<Outcome
				title="Partially paid"
				body={`Received ${zec(received)} of ${zec(invoice.amount_zat)} before the invoice closed. Collect the remaining ${zec(invoice.amount_zat - received)} another way, or refund the customer.`}
				action="New sale"
				onAction={() => onDone()}
			/>
		);
	}
	if (expired) {
		return (
			<Outcome
				title="Invoice expired"
				body="No payment arrived in time. You can charge the same amount again."
				action="Charge again"
				onAction={() => onDone(true)}
			/>
		);
	}

	const detected = status === "detected";
	const partial = detected && received > 0 && received < invoice.amount_zat;
	return (
		<section className="rise mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-8 px-4 py-6 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-14">
			<div
				className={`mx-auto w-full max-w-[min(100%,28rem,62dvh)] rounded-[2rem] p-2 transition-[box-shadow] duration-500 ${detected ? "shadow-[0_0_0_4px_var(--color-lunas),0_0_60px_-10px_var(--color-lunas)]" : "shadow-none"}`}
			>
				<QrCode
					text={invoice.zip321_uri}
					alt={`Zcash payment QR for ${zec(invoice.amount_zat)}`}
					className="rounded-3xl"
				/>
			</div>
			<div className="flex min-w-0 flex-col gap-6">
				<div>
					<p className="text-sm font-semibold tracking-wide text-kertas/60 uppercase">
						Scan to pay
					</p>
					<p className="mt-2 text-5xl leading-tight font-extrabold tracking-tight break-words tnum sm:text-6xl">
						{zec(invoice.amount_zat)}
					</p>
					<p className="mt-1 h-7 text-xl font-medium text-kertas/60 tnum">
						{fiat(invoice.amount_zat, usd)}
					</p>
				</div>

				<div
					className={`flex items-center gap-3 rounded-2xl px-4 py-4 transition-colors duration-300 ${detected ? "bg-lunas text-malam" : "bg-kertas/[0.07]"}`}
				>
					<Dot tone={detected ? "malam" : "lunas"} />
					<p className="font-bold" aria-live="polite">
						{detected ? "Payment detected · confirming" : "Waiting for payment"}
					</p>
				</div>
				{partial && (
					<p className="rise -mt-2 text-kertas/80">
						Received <b className="tnum">{zec(received)}</b>. Waiting for the
						remaining{" "}
						<b className="tnum">{zec(invoice.amount_zat - received)}</b>.
					</p>
				)}

				<div>
					<div className="flex items-center justify-between text-sm font-semibold text-kertas/60">
						<span>Expires in</span>
						<span
							className={`text-base tnum ${left < 60 ? "text-danger" : "text-kertas"}`}
						>
							{clock(left)}
						</span>
					</div>
					<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-kertas/10">
						<div
							className={`h-full origin-left rounded-full transition-transform duration-1000 ease-linear ${left < 60 ? "bg-danger" : "bg-kertas/60"}`}
							style={{ transform: `scaleX(${left / total})` }}
						/>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-kertas/60">
					<span className="font-mono">{short(invoice.address, 8)}</span>
					<span className="flex items-center gap-2 font-semibold">
						<span
							className={`h-2 w-2 rounded-full ${link === "live" ? "bg-lunas" : "pulse-dot bg-kertas/50"}`}
						/>
						{link === "live"
							? "Live"
							: link === "reconnecting"
								? "Reconnecting…"
								: "Connecting…"}
					</span>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Link
						to="/checkout/$invoiceId"
						params={{ invoiceId: invoice.id }}
						search={{
							z: invoice.zip321_uri,
							o: undefined,
							s: pos ?? undefined,
						}}
						className={`${btn.ghostDark} flex-1`}
					>
						Pay with another asset
					</Link>
					<button
						type="button"
						onClick={() => onDone(true)}
						className={`${btn.ghostDark} flex-1 text-kertas/70`}
					>
						Cancel
					</button>
				</div>
			</div>
		</section>
	);
}

function Paid({
	invoice,
	usd,
	overpaid,
	txid,
	onDone,
}: {
	invoice: Invoice;
	usd: number | null;
	overpaid: number;
	txid: string | null;
	onDone: () => void;
}) {
	const [start] = useState(Date.now);
	const now = useNow(250);
	const left = Math.max(0, AUTO_RETURN_S - (now - start) / 1000);
	const done = useRef(onDone);
	done.current = onDone;
	useEffect(() => {
		const t = setTimeout(() => done.current(), AUTO_RETURN_S * 1000);
		return () => clearTimeout(t);
	}, []);

	return (
		<section className="flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10 text-center">
			<p className="rise flex items-center gap-2 rounded-full bg-lunas/10 px-4 py-2 text-sm font-bold text-lunas">
				<span className="grid h-5 w-5 place-items-center rounded-full bg-lunas text-malam">
					<Icon name="check" className="h-3.5 w-3.5" />
				</span>
				Payment received
			</p>
			<div className="relative grid place-items-center">
				<span
					aria-hidden="true"
					className="ripple absolute aspect-square w-[min(80vw,40rem)] rounded-full bg-lunas/30"
				/>
				<h1 className="stamp relative text-[clamp(5rem,20vw,15rem)] leading-none font-extrabold tracking-[-0.03em] text-lunas">
					LUNAS
				</h1>
			</div>
			<div className="rise flex flex-col items-center gap-1 [animation-delay:250ms]">
				<p className="text-4xl font-extrabold tnum">
					{zec(invoice.amount_zat)}
				</p>
				<p className="h-7 text-xl text-kertas/60 tnum">
					{fiat(invoice.amount_zat, usd)}
				</p>
				{overpaid > 0 && (
					<p className="mt-2 rounded-full bg-kertas/10 px-4 py-1.5 text-sm font-semibold">
						Overpaid by {zec(overpaid)}
					</p>
				)}
				<p className="mt-2 h-5 font-mono text-sm text-kertas/50">
					{txid && `tx ${short(txid, 6)}`}
				</p>
			</div>
			<div className="rise flex w-full max-w-xs flex-col items-center gap-3 [animation-delay:400ms]">
				<button
					type="button"
					onClick={onDone}
					className={`${btn.lunas} w-full text-xl`}
				>
					New sale
				</button>
				<div className="h-1 w-full overflow-hidden rounded-full bg-kertas/10">
					<div
						className="h-full origin-left bg-kertas/50 transition-transform duration-300 ease-linear"
						style={{ transform: `scaleX(${left / AUTO_RETURN_S})` }}
					/>
				</div>
				<p className="text-sm text-kertas/50 tnum">
					Back to keypad in {Math.ceil(left)}s
				</p>
			</div>
		</section>
	);
}

function Outcome({
	title,
	body,
	action,
	onAction,
}: {
	title: string;
	body: string;
	action: string;
	onAction: () => void;
}) {
	return (
		<section className="rise flex flex-1 flex-col items-center justify-center gap-5 px-4 py-10 text-center">
			<span className="grid h-16 w-16 place-items-center rounded-full bg-kertas/10">
				<Icon name="alert" className="h-8 w-8" />
			</span>
			<h1 className="text-5xl font-extrabold tracking-tight">{title}</h1>
			<p className="max-w-md text-lg text-kertas/70">{body}</p>
			<button
				type="button"
				onClick={onAction}
				className={`${btn.kertas} mt-2 min-w-56 text-xl`}
			>
				{action}
			</button>
		</section>
	);
}
