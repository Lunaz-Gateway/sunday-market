export const ZAT = 100_000_000;

export const zec = (zat: number) =>
	`${(zat / ZAT).toFixed(8).replace(/\.?0+$/, "")} ZEC`;

export const short = (s: string, n = 8) =>
	s.length > 2 * n + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s;
