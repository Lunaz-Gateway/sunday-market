import { useSyncExternalStore } from "react";
import { productOf } from "./catalog";

export type Cart = Record<string, number>;

const KEY = "pasar.cart";
const empty: Cart = {};
let cart: Cart | undefined;
const subs = new Set<() => void>();

function read(): Cart {
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
		return Object.fromEntries(
			Object.entries(raw).filter(
				([id, n]) => productOf(id) && Number.isInteger(n) && (n as number) > 0,
			),
		) as Cart;
	} catch {
		return {};
	}
}

const snapshot = () => {
	cart ??= read();
	return cart;
};

function write(next: Cart) {
	cart = next;
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {}
	for (const f of subs) f();
}

const onStorage = (e: StorageEvent) => {
	if (e.key !== KEY) return;
	cart = read();
	for (const f of subs) f();
};

function subscribe(cb: () => void) {
	if (!subs.size) window.addEventListener("storage", onStorage);
	subs.add(cb);
	return () => {
		subs.delete(cb);
		if (!subs.size) window.removeEventListener("storage", onStorage);
	};
}

export const useCart = () =>
	useSyncExternalStore(subscribe, snapshot, () => empty);

export function setQty(id: string, n: number) {
	const next = { ...snapshot() };
	if (n > 0) next[id] = Math.min(99, n);
	else delete next[id];
	write(next);
}

export const addToCart = (id: string, n = 1) =>
	setQty(id, (snapshot()[id] ?? 0) + n);

// Drops lines that were just paid for.
export function removeFromCart(ids: string[]) {
	const cur = snapshot();
	if (!ids.some((id) => id in cur)) return;
	const next = { ...cur };
	for (const id of ids) delete next[id];
	write(next);
}

export const countOf = (c: Cart) => Object.values(c).reduce((t, n) => t + n, 0);
