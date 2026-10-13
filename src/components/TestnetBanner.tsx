import { useEffect, useRef } from "react";

export const TESTNET = import.meta.env.VITE_TESTNET === "1";
export const MAINNET_URL: string =
	import.meta.env.VITE_MAINNET_URL ?? "https://lunaz.alwaysbedream.dev";
const MAINNET_HOST = MAINNET_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

export function TestnetBanner({ name }: { name: string }) {
	const ref = useRef<HTMLDivElement>(null);
	// Publish the banner height so sticky/fixed bars can sit below it
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const set = () =>
			document.documentElement.style.setProperty(
				"--tb",
				`${el.offsetHeight}px`,
			);
		set();
		const ro = new ResizeObserver(set);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	if (!TESTNET) return null;
	return (
		<section
			ref={ref}
			aria-label="Testnet notice"
			className="sticky top-0 z-[100] bg-[#fcd34d] px-4 py-2 text-center text-xs leading-5 font-medium text-[#1c1917] sm:text-[0.8125rem]"
		>
			<style>{":root{--tb:2.25rem}"}</style>
			This is the testnet version of {name}. Payments use testnet ZEC (TAZ) and
			have no value. To try the mainnet version, go to{" "}
			<a href={MAINNET_URL} className="font-bold underline underline-offset-2">
				{MAINNET_HOST}
			</a>
		</section>
	);
}
