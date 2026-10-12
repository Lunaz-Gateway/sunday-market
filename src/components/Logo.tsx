export function Logo({
	tone = "dark",
	className = "h-auto w-32",
}: {
	tone?: "dark" | "light";
	className?: string;
}) {
	return (
		<img
			src={
				tone === "dark"
					? "/lunaz-horizontal-on-dark.svg"
					: "/lunaz-horizontal.svg"
			}
			alt="Lunaz"
			width={948}
			height={256}
			className={className}
		/>
	);
}
