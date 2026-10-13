import type { Art } from "#/components/ProductArt";

export const MARKET = "Sunday Market";
// Cross-chain swaps need at least this much per invoice.
export const MIN_SWAP_ZAT = 100_000;

export const CATEGORIES = [
	{ id: "kopi", label: "Coffee" },
	{ id: "fashion", label: "Batik & fashion" },
	{ id: "buku", label: "Books" },
	{ id: "gadget", label: "Gadgets" },
	{ id: "camilan", label: "Snacks" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];

export type Shop = {
	slug: string;
	name: string;
	tagline: string;
	city: string;
	category: Category;
	color: string;
	art: Art;
};

export type Product = {
	id: string;
	shop: string;
	name: string;
	note: string;
	description: string;
	zat: number;
	art: Art;
	tint: string;
	accent?: string;
};

export const SHOPS: Shop[] = [
	{
		slug: "kedai-kopi-senja",
		name: "Dusk Coffee",
		tagline: "Small-batch coffee, roasted weekly",
		city: "Bandung",
		category: "kopi",
		color: "#E9DCC8",
		art: "espresso",
	},
	{
		slug: "batik-rumah",
		name: "House of Batik",
		tagline: "Hand-stamped batik from a family workshop",
		city: "Solo",
		category: "fashion",
		color: "#D9E2EC",
		art: "shirt",
	},
	{
		slug: "toko-buku-kecil",
		name: "The Little Bookshop",
		tagline: "Indonesian stories, new and second-hand",
		city: "Yogyakarta",
		category: "buku",
		color: "#E7E0EF",
		art: "book",
	},
	{
		slug: "gadget-mungil",
		name: "Tiny Gadgets",
		tagline: "Tiny tech accessories that last",
		city: "Jakarta",
		category: "gadget",
		color: "#DCE8E2",
		art: "earbuds",
	},
	{
		slug: "dapur-nenek",
		name: "Grandma's Kitchen",
		tagline: "Grandma's recipes, baked fresh every morning",
		city: "Semarang",
		category: "camilan",
		color: "#F3E1C7",
		art: "jar",
	},
];

export const PRODUCTS: Product[] = [
	{
		id: "espresso",
		shop: "kedai-kopi-senja",
		name: "Gayo Espresso Roast",
		note: "Single origin, 250 g",
		description:
			"Arabica from the Gayo highlands of Aceh, roasted dark for espresso. Notes of cocoa, palm sugar and a little spice.",
		zat: 50_000,
		art: "espresso",
		tint: "#E9DCC8",
	},
	{
		id: "aren",
		shop: "kedai-kopi-senja",
		name: "Palm Sugar Syrup",
		note: "Palm sugar, 250 ml",
		description:
			"The secret behind a proper Indonesian iced milk coffee. Slow-cooked palm sugar syrup, no additives.",
		zat: 80_000,
		art: "bottle",
		tint: "#F0DFC6",
	},
	{
		id: "v60",
		shop: "kedai-kopi-senja",
		name: "V60 Filter Pack",
		note: "40 paper filters",
		description:
			"Unbleached paper filters sized 02. Rinse once, brew clean and bright pour-overs at home.",
		zat: 100_000,
		art: "v60",
		tint: "#DDE3D0",
	},
	{
		id: "beans",
		shop: "kedai-kopi-senja",
		name: "Toraja Whole Beans",
		note: "Medium roast, 1 kg",
		description:
			"Whole beans from Tana Toraja, roasted medium. Full body with a gentle, earthy finish. Ships within a day of roasting.",
		zat: 200_000,
		art: "beans",
		tint: "#E6D3C9",
	},
	{
		id: "kemeja-parang",
		shop: "batik-rumah",
		name: "Parang Batik Shirt",
		note: "Cotton shirt, M–XL",
		description:
			"A short-sleeve shirt in the classic parang motif, stamped by hand with copper cap and natural indigo.",
		zat: 300_000,
		art: "shirt",
		tint: "#D9E2EC",
		accent: "#2F4A7A",
	},
	{
		id: "selendang",
		shop: "batik-rumah",
		name: "Mega Mendung Silk Scarf",
		note: "Silk scarf, 180 cm",
		description:
			"The cloud motif of Cirebon on light silk. Wear it as a scarf or hang it as a wall piece.",
		zat: 200_000,
		art: "scarf",
		tint: "#DCE9F2",
		accent: "#3D7CB8",
	},
	{
		id: "tote",
		shop: "batik-rumah",
		name: "Batik Tote Bag",
		note: "Canvas, 38 × 40 cm",
		description:
			"A sturdy canvas tote with a kawung (four-petal) batik panel. Fits a laptop, a market run or both.",
		zat: 100_000,
		art: "tote",
		tint: "#EFE3D2",
		accent: "#9A5A2E",
	},
	{
		id: "pouch",
		shop: "batik-rumah",
		name: "Batik Coin Pouch",
		note: "Zip pouch, 12 cm",
		description:
			"Made from offcuts of our shirt fabric, so every pouch is a little different.",
		zat: 60_000,
		art: "pouch",
		tint: "#E6E0F0",
		accent: "#6A4C93",
	},
	{
		id: "bumi-manusia",
		shop: "toko-buku-kecil",
		name: "This Earth of Mankind",
		note: "Pramoedya, used paperback",
		description:
			"The first book of the Buru Quartet. A second-hand copy in good condition, pencil notes erased.",
		zat: 150_000,
		art: "book",
		tint: "#E7E0EF",
		accent: "#B5452F",
	},
	{
		id: "laskar-pelangi",
		shop: "toko-buku-kecil",
		name: "The Rainbow Troops",
		note: "Andrea Hirata, paperback",
		description:
			"Ten kids, one tiny school on Belitung, and a teacher who never gives up. New copy.",
		zat: 120_000,
		art: "book",
		tint: "#E0ECF2",
		accent: "#2E7FA3",
	},
	{
		id: "notebook",
		shop: "toko-buku-kecil",
		name: "Kawung Notebook",
		note: "A5 dot grid, 120 pages",
		description:
			"A lay-flat notebook with a kawung batik cover and thick paper that takes fountain pens.",
		zat: 60_000,
		art: "notebook",
		tint: "#EDE6D6",
		accent: "#4C6B4F",
	},
	{
		id: "bookmark",
		shop: "toko-buku-kecil",
		name: "Shadow Puppet Bookmark Set",
		note: "Set of 3, leather",
		description:
			"Three leather bookmarks cut in shadow-puppet shapes, with cotton tassels.",
		zat: 50_000,
		art: "bookmark",
		tint: "#F2E4D8",
		accent: "#7A4A2A",
	},
	{
		id: "cable",
		shop: "gadget-mungil",
		name: "Braided USB-C Cable",
		note: "1 m, 60 W",
		description:
			"Nylon-braided USB-C to USB-C. Charges laptops at 60 W and survives being stuffed in a bag.",
		zat: 80_000,
		art: "cable",
		tint: "#DCE8E2",
		accent: "#2E8B6A",
	},
	{
		id: "rattan-case",
		shop: "gadget-mungil",
		name: "Rattan Phone Case",
		note: "Woven rattan back",
		description:
			"A slim case with a real rattan weave from Cirebon craftsmen. Raised edges protect the camera.",
		zat: 150_000,
		art: "phonecase",
		tint: "#F1E6D0",
	},
	{
		id: "earbuds",
		shop: "gadget-mungil",
		name: "Wireless Earbuds",
		note: "24 h with case",
		description:
			"Small, light earbuds with a pocket-sized charging case and clear calls.",
		zat: 300_000,
		art: "earbuds",
		tint: "#E3E6EC",
	},
	{
		id: "stand",
		shop: "gadget-mungil",
		name: "Teak Phone Stand",
		note: "Reclaimed teak",
		description:
			"A desk stand cut from reclaimed Jepara teak. Holds any phone upright for calls and recipes.",
		zat: 100_000,
		art: "stand",
		tint: "#EADCCB",
	},
	{
		id: "nastar",
		shop: "dapur-nenek",
		name: "Pineapple Tarts",
		note: "Butter pastry, 500 g",
		description:
			"Buttery pastry with slow-cooked pineapple jam, the way Grandma makes them for Eid.",
		zat: 120_000,
		art: "jar",
		tint: "#F3E1C7",
	},
	{
		id: "keripik",
		shop: "dapur-nenek",
		name: "Spicy Cassava Chips",
		note: "Sweet chili, 200 g",
		description:
			"Thin cassava chips tossed in sweet and spicy chili. Dangerously moreish.",
		zat: 50_000,
		art: "chips",
		tint: "#F6DCD3",
	},
	{
		id: "rempeyek",
		shop: "dapur-nenek",
		name: "Peanut Rice Crackers",
		note: "With lime leaf, 250 g",
		description:
			"Crisp rice-flour crackers with whole peanuts and kaffir lime leaf.",
		zat: 60_000,
		art: "rempeyek",
		tint: "#F2E8CF",
	},
	{
		id: "lapis",
		shop: "dapur-nenek",
		name: "Thousand-Layer Spice Cake",
		note: "Baked to order, 20 cm",
		description:
			"Eighteen hand-grilled layers of butter, egg and spice. Baked to order, keeps for two weeks.",
		zat: 250_000,
		art: "cake",
		tint: "#F4E4C4",
	},
];

export const shopOf = (slug: string) => SHOPS.find((s) => s.slug === slug);
export const productOf = (id: string) => PRODUCTS.find((p) => p.id === id);
export const productsOf = (slug: string) =>
	PRODUCTS.filter((p) => p.shop === slug);
export const categoryOf = (id: string) =>
	CATEGORIES.find((c) => c.id === id)?.label ?? id;

export type Line = Product & { qty: number };

// Order lines <-> "espresso:2,v60:1" (checkout search param and server input).
export const encodeLines = (qty: Record<string, number>) =>
	Object.entries(qty)
		.filter(([, n]) => n > 0)
		.map(([id, n]) => `${id}:${n}`)
		.join(",");

export const decodeLines = (s: string | undefined): Line[] =>
	(s ?? "")
		.split(",")
		.map((part) => {
			const [id, n] = part.split(":");
			const p = productOf(id);
			const qty = Number(n);
			return p && Number.isInteger(qty) && qty > 0 && qty < 100
				? { ...p, qty }
				: null;
		})
		.filter((x) => x !== null);

export const totalOf = (lines: Line[]) =>
	lines.reduce((t, l) => t + l.zat * l.qty, 0);
