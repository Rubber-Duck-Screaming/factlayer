import { Database } from "bun:sqlite";
import { classify } from "./classify";
import type { Fact } from "./types.ts";

// Same as Fact, but category can be omitted — addFact fills it in via
// classify(text) when it's missing.
export type NewFact = Omit<Fact, "category"> & { category?: string };

let db: Database | undefined;

function getDb(): Database {
  if (!db) {
    db = openDb();
  }
  return db;
}

function openDb(path: string = "factlayer.sqlite"): Database {
  const database = new Database(path);
  database.run(`
    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      storedAt INTEGER NOT NULL,
      lastVerifiedAt INTEGER NOT NULL,
      expiresAt INTEGER
    )
  `);
  migrate(database);
  return database;
}

// Adds columns to tables created by older versions of the store.
function migrate(database: Database): void {
  const columns = database
    .query<{ name: string }, []>(`PRAGMA table_info(facts)`)
    .all();
  const hasExpiresAt = columns.some((column) => column.name === "expiresAt");
  if (!hasExpiresAt) {
    database.run(`ALTER TABLE facts ADD COLUMN expiresAt INTEGER`);
  }
}

// Points the store at a specific database (e.g. ":memory:" for tests, or a
// given file path) instead of the default on-disk database. Mainly useful
// for tests that need an isolated, fresh store.
export function setStorePath(path: string): void {
  db?.close();
  db = openDb(path);
}

// classify() is async (it may fall back to embedding similarity), so
// addFact is too whenever category is omitted.
export async function addFact(fact: NewFact): Promise<void> {
  const category = fact.category ?? (await classify(fact.text));
  getDb().run(
    `INSERT INTO facts (id, text, category, storedAt, lastVerifiedAt, expiresAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      fact.id,
      fact.text,
      category,
      fact.storedAt,
      fact.lastVerifiedAt,
      fact.expiresAt ?? null,
    ],
  );
}

export function getFact(id: string): Fact | null {
  const row = getDb()
    .query<Fact, [string]>(`SELECT * FROM facts WHERE id = ?`)
    .get(id);
  return row ?? null;
}

export function listFacts(): Fact[] {
  return getDb().query<Fact, []>(`SELECT * FROM facts`).all();
}

export function markVerified(id: string, now: number): void {
  getDb().run(`UPDATE facts SET lastVerifiedAt = ? WHERE id = ?`, [now, id]);
}
