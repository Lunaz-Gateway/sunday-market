const M = "#1C1F3D";
const K = "#F6F2E9";
const o = {
	stroke: M,
	strokeWidth: 2.5,
	strokeLinejoin: "round" as const,
	strokeLinecap: "round" as const,
};
const shadow = (cx: number, cy: number, rx: number) => (
	<ellipse cx={cx} cy={cy} rx={rx} ry="5" fill={M} opacity=".12" />
);

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

// Kawung: four petals around a dot, the oldest batik motif.
function Kawung({
	x,
	y,
	c,
	s = 1,
}: {
	x: number;
	y: number;
	c: string;
	s?: number;
}) {
	return (
		<g transform={`translate(${x} ${y}) scale(${s})`} fill={c}>
			<ellipse cx="0" cy="-4" rx="2.4" ry="3.6" />
			<ellipse cx="0" cy="4" rx="2.4" ry="3.6" />
			<ellipse cx="-4" cy="0" rx="3.6" ry="2.4" />
			<ellipse cx="4" cy="0" rx="3.6" ry="2.4" />
		</g>
	);
}

const ART = {
	espresso: () => (
		<>
			<path
				d="M50 20c-3 4 3 6 0 10M60 16c-3 4 3 6 0 10M70 20c-3 4 3 6 0 10"
				stroke={M}
				strokeOpacity=".35"
				strokeWidth="2.5"
				strokeLinecap="round"
				fill="none"
			/>
			{shadow(60, 70, 34)}
			<ellipse cx="60" cy="66" rx="32" ry="6" fill={K} {...o} />
			<path
				d="M40 38h40l-4 22a6 6 0 0 1-6 5H50a6 6 0 0 1-6-5z"
				fill={K}
				{...o}
			/>
			<path d="M80 43h4a6 6 0 0 1 0 12h-6" fill="none" {...o} />
			<ellipse cx="60" cy="38" rx="20" ry="3.5" fill="#5A3B2E" {...o} />
		</>
	),
	v60: () => (
		<>
			{shadow(60, 78, 30)}
			<path d="M38 74h44l-6-22H44z" fill={K} {...o} />
			<path d="M30 20h60L68 50H52z" fill={K} {...o} />
			<path
				d="M44 20l12 26M56 20l4 26M76 20l-12 26"
				stroke={M}
				strokeOpacity=".3"
				strokeWidth="1.5"
			/>
			<path d="M27 20h66" {...o} strokeWidth="3" />
			<path
				d="M60 52v12"
				stroke="#6B4A3A"
				strokeWidth="3"
				strokeLinecap="round"
				strokeDasharray="3 4"
			/>
		</>
	),
	beans: () => (
		<>
			{shadow(60, 80, 30)}
			<path d="M38 26h44l4 52H34z" fill="#C9A27E" {...o} />
			<path d="M38 26l4-12h36l4 12" fill="#B08A68" {...o} />
			<rect
				x="44"
				y="40"
				width="32"
				height="24"
				rx="3"
				fill={K}
				{...o}
				strokeWidth="2"
			/>
			<path d="M50 48h20M50 55h12" {...o} />
			<Bean x={24} y={74} r={-30} />
			<Bean x={94} y={72} r={25} />
			<Bean x={102} y={80} r={-10} />
		</>
	),
	bottle: () => (
		<>
			{shadow(60, 80, 22)}
			<rect x="53" y="10" width="14" height="8" rx="2" fill="#B5452F" {...o} />
			<path
				d="M55 18h10v10l9 8v38a4 4 0 0 1-4 4H50a4 4 0 0 1-4-4V36l9-8z"
				fill="#8A4B22"
				{...o}
			/>
			<rect
				x="49"
				y="46"
				width="22"
				height="20"
				rx="3"
				fill={K}
				{...o}
				strokeWidth="2"
			/>
			<path d="M54 53h12M54 59h8" {...o} strokeWidth="2" />
		</>
	),
	shirt: (c = "#2F4A7A") => (
		<>
			{shadow(60, 82, 32)}
			<path
				d="M42 16l10-4q8 8 16 0l10 4 16 14-9 10-7-5v41H42V35l-7 5-9-10z"
				fill={c}
				{...o}
			/>
			<path
				d="M46 72l28-28M46 60l20-20M52 76l24-24M62 76l14-14M46 48l8-8"
				stroke={K}
				strokeOpacity=".55"
				strokeWidth="3"
				strokeLinecap="round"
			/>
			<path d="M52 12l8 10 8-10" fill="none" {...o} strokeWidth="2" />
		</>
	),
	scarf: (c = "#3D7CB8") => (
		<>
			{shadow(60, 80, 36)}
			<path d="M24 22q18-8 36 0t36 0v44q-18 8-36 0t-36 0z" fill={c} {...o} />
			{[
				[42, 40],
				[70, 34],
				[58, 56],
			].map(([x, y]) => (
				<path
					key={`${x}${y}`}
					d={`M${x - 10} ${y + 4}a6 6 0 0 1 6-8a7 7 0 0 1 13 1a5 5 0 0 1 1 9z`}
					fill={K}
					fillOpacity=".7"
					stroke={K}
					strokeWidth="1.5"
				/>
			))}
			<path d="M96 66l4 8M90 68l2 9M30 66l-3 8" {...o} strokeWidth="2" />
		</>
	),
	tote: (c = "#9A5A2E") => (
		<>
			{shadow(60, 82, 30)}
			<path
				d="M46 34V26a14 14 0 0 1 28 0v8"
				fill="none"
				{...o}
				strokeWidth="3"
			/>
			<path d="M34 34h52l-3 44H37z" fill="#EADBC4" {...o} />
			<rect
				x="44"
				y="44"
				width="32"
				height="24"
				rx="3"
				fill={c}
				{...o}
				strokeWidth="2"
			/>
			<Kawung x={53} y={56} c={K} s={0.8} />
			<Kawung x={67} y={56} c={K} s={0.8} />
		</>
	),
	pouch: (c = "#6A4C93") => (
		<>
			{shadow(60, 76, 30)}
			<path d="M32 34q28-6 56 0l-2 34q-26 8-52 0z" fill={c} {...o} />
			<path
				d="M32 34q28-6 56 0"
				fill="none"
				stroke={K}
				strokeWidth="2"
				strokeDasharray="2 3"
			/>
			<path d="M84 33l6-8" {...o} />
			<circle cx="91" cy="23" r="3" fill={K} {...o} strokeWidth="2" />
			<Kawung x={48} y={52} c={K} s={0.9} />
			<Kawung x={72} y={52} c={K} s={0.9} />
		</>
	),
	book: (c = "#B5452F") => (
		<>
			{shadow(62, 82, 30)}
			<path d="M42 16h40v62H42z" fill={K} {...o} />
			<path d="M38 12h40a3 3 0 0 1 3 3v58H41a3 3 0 0 1-3-3z" fill={c} {...o} />
			<path d="M44 12v61" stroke={M} strokeOpacity=".35" strokeWidth="2" />
			<path
				d="M52 28h20M52 35h14"
				stroke={K}
				strokeWidth="3"
				strokeLinecap="round"
			/>
			<circle cx="62" cy="54" r="7" fill={K} fillOpacity=".8" />
		</>
	),
	notebook: (c = "#4C6B4F") => (
		<>
			{shadow(60, 82, 30)}
			<rect x="36" y="16" width="48" height="62" rx="4" fill={c} {...o} />
			{[46, 56, 66, 76].map((x) => (
				<path key={x} d={`M${x} 12v8`} {...o} strokeWidth="3" />
			))}
			<Kawung x={50} y={40} c={K} />
			<Kawung x={70} y={40} c={K} />
			<Kawung x={60} y={56} c={K} />
		</>
	),
	bookmark: (c = "#7A4A2A") => (
		<>
			{shadow(60, 82, 30)}
			{[38, 56, 74].map((x, i) => (
				<g key={x} transform={`rotate(${(i - 1) * 8} ${x + 6} 50)`}>
					<path
						d={`M${x} 18h12v52l-6-6-6 6z`}
						fill={i === 1 ? "#C98E3B" : c}
						{...o}
						strokeWidth="2"
					/>
					<path
						d={`M${x + 6} 28c-4 4 4 8 0 12s4 8 0 12`}
						fill="none"
						stroke={K}
						strokeWidth="2"
					/>
					<path
						d={`M${x + 6} 18v-8`}
						stroke="#B5452F"
						strokeWidth="2.5"
						strokeLinecap="round"
					/>
				</g>
			))}
		</>
	),
	cable: (c = "#2E8B6A") => (
		<>
			{shadow(60, 80, 34)}
			<path
				d="M30 30c0 30 30 40 40 20s30-10 24 22"
				fill="none"
				stroke={M}
				strokeWidth="9"
				strokeLinecap="round"
			/>
			<path
				d="M30 30c0 30 30 40 40 20s30-10 24 22"
				fill="none"
				stroke={c}
				strokeWidth="5"
				strokeLinecap="round"
				strokeDasharray="3 2"
			/>
			<rect x="23" y="12" width="14" height="20" rx="4" fill={K} {...o} />
			<rect
				x="27"
				y="6"
				width="6"
				height="7"
				rx="2"
				fill="#9AA3B5"
				{...o}
				strokeWidth="2"
			/>
			<rect x="87" y="68" width="14" height="14" rx="4" fill={K} {...o} />
		</>
	),
	phonecase: () => (
		<>
			{shadow(60, 82, 24)}
			<rect x="42" y="10" width="36" height="70" rx="9" fill="#D9B98A" {...o} />
			<path
				d="M46 26l28 28M46 40l28 28M46 54l22 22M52 14l22 22M46 70l28-28M46 56l28-28M46 42l28-28M56 76l18-18"
				stroke="#9A7146"
				strokeWidth="1.6"
			/>
			<rect x="47" y="15" width="14" height="16" rx="4" fill={M} />
			<circle cx="54" cy="20" r="2.5" fill="#5B6385" />
			<circle cx="54" cy="27" r="2.5" fill="#5B6385" />
		</>
	),
	earbuds: () => (
		<>
			{shadow(60, 80, 34)}
			<rect
				x="38"
				y="34"
				width="44"
				height="44"
				rx="16"
				fill="#FFFFFF"
				{...o}
			/>
			<path d="M38 50h44" {...o} strokeWidth="2" />
			<circle cx="60" cy="62" r="2.5" fill="#2E8B6A" />
			{[24, 96].map((x, i) => (
				<g key={x} transform={`translate(${x} 40) rotate(${i ? 12 : -12})`}>
					<path d="M-3 4v26" {...o} strokeWidth="7" stroke={M} />
					<path
						d="M-3 4v26"
						stroke="#FFFFFF"
						strokeWidth="2.5"
						strokeLinecap="round"
					/>
					<circle r="9" fill="#FFFFFF" {...o} />
					<circle cx="2" cy="-1" r="3.5" fill="#9AA3B5" />
				</g>
			))}
		</>
	),
	stand: () => (
		<>
			{shadow(60, 82, 34)}
			<rect
				x="48"
				y="10"
				width="28"
				height="52"
				rx="5"
				fill={M}
				{...o}
				transform="rotate(12 62 36)"
			/>
			<rect
				x="52"
				y="15"
				width="20"
				height="40"
				rx="2"
				fill="#5B6385"
				transform="rotate(12 62 36)"
			/>
			<path d="M30 78l22-30h8L46 78z" fill="#A86B3C" {...o} />
			<path d="M28 78h64" {...o} strokeWidth="3" />
			<path d="M40 66h40v12H40z" fill="#C2814B" {...o} />
		</>
	),
	jar: () => (
		<>
			{shadow(60, 82, 28)}
			<rect x="40" y="12" width="40" height="10" rx="3" fill="#B5452F" {...o} />
			<path
				d="M38 24h44v48a8 8 0 0 1-8 8H46a8 8 0 0 1-8-8z"
				fill="#FFFFFF"
				fillOpacity=".7"
				{...o}
			/>
			{[
				[50, 38],
				[66, 36],
				[58, 50],
				[46, 62],
				[70, 58],
				[58, 70],
			].map(([x, y]) => (
				<g key={`${x}${y}`}>
					<circle
						cx={x}
						cy={y}
						r="7"
						fill="#E7B04F"
						stroke="#B9852E"
						strokeWidth="1.5"
					/>
					<circle cx={x} cy={y - 2} r="2" fill="#B5452F" />
				</g>
			))}
		</>
	),
	chips: () => (
		<>
			{shadow(60, 82, 30)}
			<path
				d="M38 14h44l-4 8 4 8v40l-4 8H42l-4-8V30l4-8z"
				fill="#C8372D"
				{...o}
			/>
			<path
				d="M40 22h40M40 70h40"
				stroke={M}
				strokeWidth="1.5"
				strokeDasharray="2 2"
			/>
			<ellipse
				cx="60"
				cy="46"
				rx="14"
				ry="11"
				fill="#F2C46B"
				{...o}
				strokeWidth="2"
			/>
			<path
				d="M52 44l4 3 6-5 5 4"
				fill="none"
				stroke="#C8372D"
				strokeWidth="2"
			/>
			<ellipse
				cx="96"
				cy="74"
				rx="9"
				ry="6"
				fill="#F2C46B"
				{...o}
				strokeWidth="2"
			/>
			<ellipse
				cx="24"
				cy="72"
				rx="8"
				ry="5"
				fill="#F2C46B"
				{...o}
				strokeWidth="2"
			/>
		</>
	),
	rempeyek: () => (
		<>
			{shadow(60, 78, 36)}
			<path
				d="M28 58q-6-18 14-24t30 2 20 18-16 18-34 2-14-16z"
				fill="#E9C77E"
				{...o}
			/>
			<path d="M56 34q8-14 24-10t16 14-14 12-22-4z" fill="#F0D592" {...o} />
			{[
				[44, 52],
				[56, 60],
				[66, 50],
				[74, 64],
				[48, 66],
				[72, 32],
				[84, 38],
			].map(([x, y]) => (
				<ellipse
					key={`${x}${y}`}
					cx={x}
					cy={y}
					rx="3.5"
					ry="2.5"
					fill="#B5763A"
				/>
			))}
			<path
				d="M60 44l4 2"
				stroke="#4C6B4F"
				strokeWidth="3"
				strokeLinecap="round"
			/>
		</>
	),
	cake: () => (
		<>
			{shadow(60, 80, 34)}
			<path d="M26 40l46-14 22 12v34L48 86 26 72z" fill="#F1D9A4" {...o} />
			{[46, 52, 58, 64, 70].map((y) => (
				<path
					key={y}
					d={`M26 ${y}l22 12 46-14`}
					fill="none"
					stroke="#7A4A2A"
					strokeWidth="2.2"
				/>
			))}
			<path d="M48 52v34" {...o} />
			<path d="M26 40l22 12 46-14" fill="none" {...o} />
			<path d="M26 40l46-14 22 12-46 14z" fill="#9C5B2A" {...o} />
		</>
	),
} satisfies Record<string, (accent?: string) => React.ReactNode>;

export type Art = keyof typeof ART;

export function ProductArt({
	art,
	accent,
	className = "",
}: {
	art: Art;
	accent?: string;
	className?: string;
}) {
	return (
		<svg viewBox="0 0 120 90" className={className} aria-hidden="true">
			{ART[art](accent)}
		</svg>
	);
}
