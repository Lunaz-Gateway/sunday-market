export const STORE = "Kedai Kopi Online";

export const PRODUCTS = [
	{
		id: "espresso",
		name: "Espresso Gayo",
		note: "Single origin, 250 g",
		zat: 50_000,
		tint: "#E9DCC8",
	},
	{
		id: "v60",
		name: "V60 Filter Pack",
		note: "40 paper filters",
		zat: 100_000,
		tint: "#DDE3D0",
	},
	{
		id: "beans",
		name: "Toraja Beans",
		note: "Medium roast, 1 kg",
		zat: 200_000,
		tint: "#E6D3C9",
	},
] as const;

export type ProductId = (typeof PRODUCTS)[number]["id"];

// Cart <-> "espresso:2,v60:1" for the checkout's order summary.
export const encodeCart = (qty: Record<string, number>) =>
	Object.entries(qty)
		.filter(([, n]) => n > 0)
		.map(([id, n]) => `${id}:${n}`)
		.join(",");

export const decodeCart = (s: string | undefined) =>
	(s ?? "")
		.split(",")
		.map((part) => {
			const [id, n] = part.split(":");
			const p = PRODUCTS.find((x) => x.id === id);
			const qty = Number(n);
			return p && Number.isInteger(qty) && qty > 0 && qty < 100
				? { ...p, qty }
				: null;
		})
		.filter((x) => x !== null);
