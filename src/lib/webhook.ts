import { createHmac, timingSafeEqual } from "node:crypto";

export const TOLERANCE_SECS = 300;

// X-Lunaz-Signature: t=<unix s>,v1=<hex HMAC-SHA256(secret, "{t}.{raw body}")>.
// Returns null when valid, otherwise why it was rejected.
export function checkSignature(
	raw: string,
	secret: string,
	header: string | null,
	now = Math.floor(Date.now() / 1000),
): "missing" | "malformed" | "stale" | "mismatch" | null {
	if (!header) return "missing";
	const parts = new Map(
		header.split(",").map((kv) => {
			const i = kv.indexOf("=");
			return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()] as const;
		}),
	);
	const t = parts.get("t") ?? "";
	const v1 = parts.get("v1") ?? "";
	if (!/^\d{1,12}$/.test(t) || !/^[0-9a-f]{64}$/i.test(v1)) return "malformed";
	if (Math.abs(now - Number(t)) > TOLERANCE_SECS) return "stale";
	const want = createHmac("sha256", secret).update(`${t}.${raw}`).digest();
	return timingSafeEqual(Buffer.from(v1, "hex"), want) ? null : "mismatch";
}

export function sign(
	raw: string,
	secret: string,
	t = Math.floor(Date.now() / 1000),
) {
	const v1 = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
	return `t=${t},v1=${v1}`;
}
