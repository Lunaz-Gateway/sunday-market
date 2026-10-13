export const ZAT = 100_000_000;

export const zec = (zat: number) =>
	`${(zat / ZAT).toFixed(8).replace(/\.?0+$/, "")} ZEC`;

export const short = (s: string, n = 8) =>
	s.length > 2 * n + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s;

export const underpaidText = (got: number, total: number) =>
	`Received ${zec(got)} of ${zec(total)}. The merchant will contact you about a refund.`;

const usdFmt = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export const fiat = (zat: number, usdPerZec: number | null) =>
	usdPerZec ? `≈ ${usdFmt.format((zat / ZAT) * usdPerZec)}` : "";

export const usd = (n: number) => usdFmt.format(n);

export const clock = (secs: number) =>
	`${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
