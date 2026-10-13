import { createHmac, timingSafeEqual } from "node:crypto";

// Lunaz signs the raw body: X-Lunaz-Signature = hex HMAC-SHA256(body, secret).
export function signatureOk(
	raw: string,
	secret: string,
	header: string | null,
) {
	if (!header) return false;
	const want = createHmac("sha256", secret).update(raw).digest();
	const got = Buffer.from(header.trim(), "hex");
	return got.length === want.length && timingSafeEqual(got, want);
}

export const sign = (raw: string, secret: string) =>
	createHmac("sha256", secret).update(raw).digest("hex");
