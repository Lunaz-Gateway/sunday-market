import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

let cache: { at: number; usd: number } | undefined;

// ZEC/USD from 1Click's token list, cached for 5 minutes. null when unknown.
export const getZecUsd = createServerFn({ method: "GET" }).handler(
	async (): Promise<number | null> => {
		if (cache && Date.now() - cache.at < 300_000) return cache.usd;
		try {
			const res = await fetch("https://1click.chaindefuser.com/v0/tokens", {
				signal: AbortSignal.timeout(5000),
			});
			if (!res.ok) return cache?.usd ?? null;
			const list: { assetId: string; price?: number }[] = await res.json();
			const usd = list.find((t) => t.assetId === "nep141:zec.omft.near")?.price;
			if (typeof usd !== "number" || !(usd > 0)) return cache?.usd ?? null;
			cache = { at: Date.now(), usd };
			return usd;
		} catch {
			return cache?.usd ?? null;
		}
	},
);

export function useZecUsd() {
	const [usd, setUsd] = useState<number | null>(null);
	useEffect(() => {
		getZecUsd()
			.then(setUsd)
			.catch(() => {});
	}, []);
	return usd;
}
