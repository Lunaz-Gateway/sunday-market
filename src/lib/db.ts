import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type OrderRow = {
	id: string;
	seller: string;
	invoice_id: string;
	lines: string;
	amount_zat: number;
	status: "pending" | "detected" | "paid" | "underpaid" | "expired";
	received_zat: number;
	txid: string | null;
	contact_email: string | null;
	created_at: number;
	paid_at: number | null;
	updated_at: number;
};

let db: DatabaseSync | undefined;

// Opened lazily, once per process.
export function store(): DatabaseSync {
	if (db) return db;
	const file = process.env.DEMO_DB ?? "./data/demo.db";
	mkdirSync(dirname(file), { recursive: true });
	db = new DatabaseSync(file);
	db.exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA busy_timeout = 5000;
		CREATE TABLE IF NOT EXISTS orders(
			id TEXT PRIMARY KEY,
			seller TEXT NOT NULL,
			invoice_id TEXT NOT NULL UNIQUE,
			lines TEXT NOT NULL,
			amount_zat INTEGER NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			received_zat INTEGER NOT NULL DEFAULT 0,
			txid TEXT,
			contact_email TEXT,
			created_at INTEGER NOT NULL,
			paid_at INTEGER,
			updated_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS webhook_events(
			id INTEGER PRIMARY KEY,
			seller TEXT NOT NULL,
			type TEXT,
			invoice_id TEXT,
			signature_valid INTEGER NOT NULL,
			status_code INTEGER NOT NULL,
			body TEXT NOT NULL,
			received_at INTEGER NOT NULL
		);
	`);
	return db;
}

export const nowSecs = () => Math.floor(Date.now() / 1000);
