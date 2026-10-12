import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Logo } from "#/components/Logo";
import { short, ZAT, zec } from "#/lib/format";
import { createInvoice, getInvoice, type Invoice } from "#/lib/invoice";
import { useInvoiceStatus } from "#/lib/useInvoiceStatus";

export const Route = createFileRoute("/")({ component: Cashier });

const QUICK = ["0.01", "0.05", "0.1", "0.5", "1"];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "<"];

function toZat(amount: string) {
	const [whole, frac = ""] = amount.split(".");
	return Number(whole || "0") * ZAT + Number(frac.padEnd(8, "0"));
}

function Cashier() {
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	return (
		<main className="flex min-h-screen flex-col">
			{invoice ? (
				<InvoiceView invoice={invoice} onDone={() => setInvoice(null)} />
			) : (
				<Entry onCreated={setInvoice} />
			)}
		</main>
	);
}

function Entry({ onCreated }: { onCreated: (i: Invoice) => void }) {
	const [amount, setAmount] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const zat = toZat(amount);

	const press = (k: string) => {
		setError("");
		setAmount((a) => {
			if (k === "<") return a.slice(0, -1);
			if (k === ".") return a.includes(".") ? a : `${a || "0"}.`;
			if (a.includes(".") && a.split(".")[1].length >= 8) return a;
			return a === "0" ? k : a + k;
		});
	};

	const charge = async () => {
		setBusy(true);
		try {
			onCreated(await createInvoice({ data: { amountZat: zat } }));
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
			setBusy(false);
		}
	};

	return (
		<>
			<header className="p-6">
				<Logo />
			</header>
			<section className="mx-auto grid w-full max-w-4xl flex-1 gap-8 p-6 md:grid-cols-2 md:items-center">
				<div className="flex flex-col gap-6">
					<div>
						<p className="text-sm font-medium opacity-70">Amount</p>
						<p className="text-6xl font-bold tabular-nums break-all md:text-7xl">
							{amount || "0"}
							<span className="ml-3 text-2xl opacity-70">ZEC</span>
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{QUICK.map((q) => (
							<button
								key={q}
								type="button"
								onClick={() => setAmount(q)}
								className="rounded-full border border-kertas/30 px-4 py-2 text-sm font-medium active:bg-kertas/10"
							>
								{q}
							</button>
						))}
					</div>
					{error && (
						<p role="alert" className="text-sm text-red-300">
							{error}
						</p>
					)}
				</div>
				<div className="flex flex-col gap-3">
					<div className="grid grid-cols-3 gap-3">
						{KEYS.map((k) => (
							<button
								key={k}
								type="button"
								onClick={() => press(k)}
								aria-label={k === "<" ? "Backspace" : k}
								className="rounded-2xl bg-kertas/10 py-5 text-3xl font-bold transition-transform active:scale-95 active:bg-kertas/20"
							>
								{k === "<" ? "⌫" : k}
							</button>
						))}
					</div>
					<button
						type="button"
						disabled={zat <= 0 || busy}
						onClick={charge}
						className="rounded-2xl bg-lunas py-5 text-2xl font-bold text-malam transition-transform active:scale-[0.98] disabled:opacity-40"
					>
						{busy ? "Creating invoice…" : "Charge"}
					</button>
				</div>
			</section>
		</>
	);
}

function InvoiceView({
	invoice,
	onDone,
}: {
	invoice: Invoice;
	onDone: () => void;
}) {
	const { status } = useInvoiceStatus(invoice.id);
	const [now, setNow] = useState(() => Date.now() / 1000);
	const [qr, setQr] = useState("");
	const [txid, setTxid] = useState<string | null>(null);

	useEffect(() => {
		const t = setInterval(() => setNow(Date.now() / 1000), 1000);
		return () => clearInterval(t);
	}, []);
	useEffect(() => {
		QRCode.toDataURL(invoice.zip321_uri, {
			width: 640,
			margin: 1,
			color: { dark: "#1C1F3D", light: "#F6F2E9" },
		}).then(setQr);
	}, [invoice.zip321_uri]);
	useEffect(() => {
		if (status === "paid") {
			getInvoice({ data: { id: invoice.id } })
				.then((i) => setTxid(i.txid))
				.catch(() => {});
		}
	}, [status, invoice.id]);

	const left = Math.max(0, Math.floor(invoice.expires_at - now));
	const expired = status === "expired" || (status === "pending" && left === 0);

	if (status === "paid") {
		return (
			<section className="rise flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
				<h1 className="text-[clamp(5rem,22vw,16rem)] leading-none font-extrabold tracking-tight text-lunas">
					LUNAS
				</h1>
				<p className="text-3xl font-bold">{zec(invoice.amount_zat)}</p>
				{txid && (
					<p className="font-mono text-sm opacity-70">tx {short(txid, 6)}</p>
				)}
				<button
					type="button"
					onClick={onDone}
					className="mt-4 rounded-2xl bg-lunas px-10 py-4 text-xl font-bold text-malam active:scale-95"
				>
					New sale
				</button>
			</section>
		);
	}

	if (expired) {
		return (
			<section className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
				<h1 className="text-5xl font-bold">Invoice expired</h1>
				<p className="opacity-70">No payment was received in time.</p>
				<button
					type="button"
					onClick={onDone}
					className="rounded-2xl bg-kertas px-10 py-4 text-xl font-bold text-malam active:scale-95"
				>
					New sale
				</button>
			</section>
		);
	}

	const mm = String(Math.floor(left / 60)).padStart(2, "0");
	const ss = String(left % 60).padStart(2, "0");
	return (
		<>
			<header className="p-6">
				<Logo />
			</header>
			<section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-8 p-6 md:flex-row md:justify-center">
				<div className="w-full max-w-sm rounded-3xl bg-kertas p-4">
					{qr && (
						<img
							src={qr}
							alt="Payment QR code"
							className="aspect-square w-full"
						/>
					)}
				</div>
				<div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
					<p className="text-5xl font-bold tabular-nums">
						{zec(invoice.amount_zat)}
					</p>
					<p className="font-mono text-sm opacity-70">
						{short(invoice.address, 10)}
					</p>
					<p className="text-2xl font-medium tabular-nums">
						{mm}:{ss}
					</p>
					<output className="flex items-center gap-3 rounded-full border border-kertas/30 px-5 py-2 font-medium">
						<span className="pulse-dot h-2.5 w-2.5 rounded-full bg-lunas" />
						{status === "detected"
							? "Payment detected, waiting for confirmation"
							: "Waiting for payment"}
					</output>
					<Link
						to="/checkout/$invoiceId"
						params={{ invoiceId: invoice.id }}
						search={{ z: invoice.zip321_uri }}
						className="text-sm underline underline-offset-4 opacity-80"
					>
						Pay with another asset
					</Link>
					<button
						type="button"
						onClick={onDone}
						className="mt-2 rounded-2xl border border-kertas/30 px-8 py-3 font-medium active:bg-kertas/10"
					>
						Cancel / New sale
					</button>
				</div>
			</section>
		</>
	);
}
