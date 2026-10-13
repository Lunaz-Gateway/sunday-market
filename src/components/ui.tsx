import QRCode from "qrcode";
import { useEffect, useState, useSyncExternalStore } from "react";

// Buttons: 56px minimum touch target, press feedback, consistent radius.
const base =
	"press inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 font-bold disabled:cursor-not-allowed disabled:opacity-40";
export const btn = {
	lunas: `${base} bg-lunas text-malam hover:brightness-105 disabled:bg-kertas/10 disabled:text-kertas/40 disabled:opacity-100`,
	ink: `${base} bg-malam text-kertas hover:bg-malam-2`,
	ghostDark: `${base} border border-kertas/20 text-kertas hover:bg-kertas/5 active:bg-kertas/10`,
	ghostLight: `${base} border border-malam/15 text-malam hover:bg-malam/5 active:bg-malam/10`,
};

export function useNow(ms = 1000) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), ms);
		return () => clearInterval(t);
	}, [ms]);
	return now;
}

// Toasts: call toast() from anywhere; <Toaster /> lives in the root.
type Action = { label: string; onClick: () => void };
type Toast = { id: number; text: string; out?: boolean; action?: Action };
let toasts: Toast[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => {
	for (const f of subs) f();
};
const set = (next: Toast[]) => {
	toasts = next;
	emit();
};

const dismiss = (id: number) => {
	set(toasts.map((t) => (t.id === id ? { ...t, out: true } : t)));
	setTimeout(() => set(toasts.filter((t) => t.id !== id)), 200);
};

export function toast(text: string, action?: Action) {
	const id = ++seq;
	set([...toasts, { id, text, action }].slice(-3));
	setTimeout(() => dismiss(id), action ? 6000 : 2400);
}

const none: Toast[] = [];
export function Toaster() {
	const list = useSyncExternalStore(
		(cb) => {
			subs.add(cb);
			return () => {
				subs.delete(cb);
			};
		},
		() => toasts,
		() => none,
	);
	return (
		<output
			aria-live="polite"
			className="toaster pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
		>
			{list.map((t) => (
				<div
					key={t.id}
					data-out={t.out || undefined}
					className="toast flex items-center gap-2 rounded-full bg-malam px-5 py-3 text-sm font-semibold text-kertas shadow-xl shadow-malam/30 ring-1 ring-kertas/15"
				>
					<Icon name="check" className="h-4 w-4 text-lunas" />
					{t.text}
					{t.action && (
						<button
							type="button"
							onClick={() => {
								t.action?.onClick();
								dismiss(t.id);
							}}
							className="pointer-events-auto -my-2 -mr-3 min-h-11 rounded-full px-3 font-bold text-lunas underline"
						>
							{t.action.label}
						</button>
					)}
				</div>
			))}
		</output>
	);
}

const paths = {
	check: "M5 12.5l4.5 4.5L19 7.5",
	copy: "M9 9h10v10H9zM5 15V5h10",
	back: "M15 5l-7 7 7 7",
	wallet: "M4 7h16v12H4zM4 7l12-3v3M16 13h1",
	alert:
		"M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
	cart: "M3 4h2l2.4 11h11L21 8H6.2M10 20h.01M17 20h.01",
	lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3",
};

export function Icon({
	name,
	className = "h-5 w-5",
}: {
	name: keyof typeof paths;
	className?: string;
}) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden="true"
		>
			<path d={paths[name]} />
		</svg>
	);
}

export function CopyButton({
	text,
	label,
	what,
	className = "",
}: {
	text: string;
	label: string;
	what: string;
	className?: string;
}) {
	const [done, setDone] = useState(false);
	return (
		<button
			type="button"
			aria-label={label}
			onClick={() => {
				if (!navigator.clipboard) return toast("Copy not available here");
				navigator.clipboard.writeText(text).then(
					() => {
						setDone(true);
						toast(`${what} copied`);
						setTimeout(() => setDone(false), 1600);
					},
					() => toast("Could not copy"),
				);
			}}
			className={`press inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold ${className}`}
		>
			<Icon name={done ? "check" : "copy"} className="h-4 w-4" />
			{done ? "Copied" : "Copy"}
		</button>
	);
}

// QR with a 4-module quiet zone and the Lunaz symbol on a clear tile.
// Level H tolerates the ~5% the tile covers.
export function QrCode({
	text,
	alt,
	symbol = true,
	className = "",
}: {
	text: string;
	alt: string;
	symbol?: boolean;
	className?: string;
}) {
	const [src, setSrc] = useState("");
	useEffect(() => {
		let live = true;
		QRCode.toString(text, {
			type: "svg",
			margin: 4,
			errorCorrectionLevel: symbol ? "H" : "M",
			color: { dark: "#1C1F3D", light: "#F6F2E9" },
		}).then((svg) => {
			if (live) setSrc(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
		});
		return () => {
			live = false;
		};
	}, [text, symbol]);
	return (
		<div
			className={`relative aspect-square overflow-hidden rounded-2xl bg-kertas text-malam ${className}`}
		>
			{src ? (
				<>
					<img
						src={src}
						alt={alt}
						className="rise h-full w-full [image-rendering:pixelated]"
					/>
					{symbol && (
						<div className="absolute top-1/2 left-1/2 w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-[18%] bg-kertas">
							<img src="/lunaz-symbol.svg" alt="" className="block w-full" />
						</div>
					)}
				</>
			) : (
				<div className="skeleton absolute inset-[8%] rounded-lg" />
			)}
		</div>
	);
}

export function Dot({ tone = "lunas" }: { tone?: "lunas" | "malam" }) {
	return (
		<span
			aria-hidden="true"
			className={`relative inline-block h-2.5 w-2.5 shrink-0 rounded-full ${tone === "lunas" ? "bg-lunas text-lunas" : "bg-malam text-malam"} ring`}
		/>
	);
}
