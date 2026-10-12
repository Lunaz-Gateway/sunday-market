import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "#/components/Logo";
import { zec } from "#/lib/format";
import { createInvoice } from "#/lib/invoice";

export const Route = createFileRoute("/store")({
	head: () => ({ meta: [{ title: "Kedai Kopi Online" }] }),
	component: Store,
});

const PRODUCTS = [
	{
		id: "espresso",
		name: "Espresso Gayo",
		note: "Single origin, 250 g",
		zat: 10_000,
	},
	{ id: "v60", name: "V60 Filter Pack", note: "40 paper filters", zat: 50_000 },
	{
		id: "beans",
		name: "Toraja Beans",
		note: "Medium roast, 1 kg",
		zat: 100_000,
	},
];

function Store() {
	const navigate = useNavigate();
	const [qty, setQty] = useState<Record<string, number>>({});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const total = PRODUCTS.reduce((t, p) => t + p.zat * (qty[p.id] ?? 0), 0);

	const add = (id: string, d: number) =>
		setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + d) }));

	const checkout = async () => {
		setBusy(true);
		setError("");
		try {
			const inv = await createInvoice({ data: { amountZat: total } });
			await navigate({
				to: "/checkout/$invoiceId",
				params: { invoiceId: inv.id },
				search: { z: inv.zip321_uri },
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
			setBusy(false);
		}
	};

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6">
			<header className="flex items-center justify-between">
				<h1 className="text-2xl font-extrabold">Kedai Kopi Online</h1>
				<Logo />
			</header>
			<ul className="flex flex-col gap-3">
				{PRODUCTS.map((p) => (
					<li
						key={p.id}
						className="flex items-center justify-between gap-4 rounded-2xl bg-kertas/10 p-4"
					>
						<div>
							<p className="font-bold">{p.name}</p>
							<p className="text-sm opacity-70">{p.note}</p>
							<p className="mt-1 font-medium tabular-nums">{zec(p.zat)}</p>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								aria-label={`Remove one ${p.name}`}
								onClick={() => add(p.id, -1)}
								className="h-10 w-10 rounded-full border border-kertas/30 text-xl"
							>
								−
							</button>
							<output className="w-5 text-center font-bold tabular-nums">
								{qty[p.id] ?? 0}
							</output>
							<button
								type="button"
								aria-label={`Add one ${p.name}`}
								onClick={() => add(p.id, 1)}
								className="h-10 w-10 rounded-full border border-kertas/30 text-xl"
							>
								+
							</button>
						</div>
					</li>
				))}
			</ul>
			{error && (
				<p role="alert" className="text-sm text-red-300">
					{error}
				</p>
			)}
			<button
				type="button"
				disabled={total <= 0 || busy}
				onClick={checkout}
				className="rounded-2xl bg-lunas py-4 text-xl font-bold text-malam disabled:opacity-40"
			>
				{busy ? "Creating invoice…" : `Checkout · ${zec(total)}`}
			</button>
		</main>
	);
}
