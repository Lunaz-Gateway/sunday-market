import type { ProductId } from "#/lib/products";

const M = "#1C1F3D";
const K = "#F6F2E9";

function Bean({ x, y, r = 0 }: { x: number; y: number; r?: number }) {
	return (
		<g transform={`translate(${x} ${y}) rotate(${r})`}>
			<ellipse rx="5" ry="7" fill="#6B4A3A" />
			<path
				d="M0 -6 C-2 -2 2 2 0 6"
				stroke="#3E2A22"
				strokeWidth="1.2"
				fill="none"
			/>
		</g>
	);
}

export function ProductArt({
	id,
	className = "",
}: {
	id: ProductId;
	className?: string;
}) {
	return (
		<svg viewBox="0 0 120 90" className={className} aria-hidden="true">
			{id === "espresso" && (
				<g>
					<path
						d="M50 20c-3 4 3 6 0 10M60 16c-3 4 3 6 0 10M70 20c-3 4 3 6 0 10"
						stroke={M}
						strokeOpacity=".35"
						strokeWidth="2.5"
						strokeLinecap="round"
						fill="none"
					/>
					<ellipse cx="60" cy="70" rx="34" ry="6" fill={M} opacity=".12" />
					<ellipse
						cx="60"
						cy="66"
						rx="32"
						ry="6"
						fill={K}
						stroke={M}
						strokeWidth="2.5"
					/>
					<path
						d="M40 38h40l-4 22a6 6 0 0 1-6 5H50a6 6 0 0 1-6-5z"
						fill={K}
						stroke={M}
						strokeWidth="2.5"
						strokeLinejoin="round"
					/>
					<path
						d="M80 43h4a6 6 0 0 1 0 12h-6"
						stroke={M}
						strokeWidth="2.5"
						fill="none"
					/>
					<ellipse
						cx="60"
						cy="38"
						rx="20"
						ry="3.5"
						fill="#5A3B2E"
						stroke={M}
						strokeWidth="2.5"
					/>
				</g>
			)}
			{id === "v60" && (
				<g>
					<ellipse cx="60" cy="78" rx="30" ry="5" fill={M} opacity=".12" />
					<path
						d="M38 74h44l-6-22H44z"
						fill={K}
						stroke={M}
						strokeWidth="2.5"
						strokeLinejoin="round"
					/>
					<path
						d="M30 20h60L68 50H52z"
						fill={K}
						stroke={M}
						strokeWidth="2.5"
						strokeLinejoin="round"
					/>
					<path
						d="M44 20l12 26M56 20l4 26M76 20l-12 26"
						stroke={M}
						strokeOpacity=".3"
						strokeWidth="1.5"
					/>
					<path
						d="M27 20h66"
						stroke={M}
						strokeWidth="3"
						strokeLinecap="round"
					/>
					<path
						d="M60 52v12"
						stroke="#6B4A3A"
						strokeWidth="3"
						strokeLinecap="round"
						strokeDasharray="3 4"
					/>
				</g>
			)}
			{id === "beans" && (
				<g>
					<ellipse cx="60" cy="80" rx="30" ry="5" fill={M} opacity=".12" />
					<path
						d="M38 26h44l4 52H34z"
						fill="#C9A27E"
						stroke={M}
						strokeWidth="2.5"
						strokeLinejoin="round"
					/>
					<path
						d="M38 26l4-12h36l4 12"
						fill="#B08A68"
						stroke={M}
						strokeWidth="2.5"
						strokeLinejoin="round"
					/>
					<rect
						x="44"
						y="40"
						width="32"
						height="24"
						rx="3"
						fill={K}
						stroke={M}
						strokeWidth="2"
					/>
					<path
						d="M50 48h20M50 55h12"
						stroke={M}
						strokeWidth="2.5"
						strokeLinecap="round"
					/>
					<Bean x={24} y={74} r={-30} />
					<Bean x={94} y={72} r={25} />
					<Bean x={102} y={80} r={-10} />
				</g>
			)}
		</svg>
	);
}
