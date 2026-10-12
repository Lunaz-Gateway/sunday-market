export const ZAT = 100_000_000;

export const zec = (zat: number) =>
	`${(zat / ZAT).toFixed(8).replace(/\.?0+$/, "")} ZEC`;

export const short = (s: string, n = 8) =>
	s.length > 2 * n + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s;

export const partialText = (got: number, total: number) =>
	`Partial payment received: ${zec(got)} of ${zec(total)}. Send the remaining ${zec(total - got)} to the same address.`;

export const underpaidText = (got: number, total: number) =>
	`Partially paid: received ${zec(got)} of ${zec(total)}. The merchant will contact you about a refund.`;
