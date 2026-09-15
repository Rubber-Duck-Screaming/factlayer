import { Database } from "bun:sqlite";
import type { Fact } from "./types.ts";

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
      lastVerifiedAt INTEGER NOT NULL
    )
  `);
  return database;
}

// Points the store at a specific database (e.g. ":memory:" for tests, or a
// given file path) instead of the default on-disk database. Mainly useful
// for tests that need an isolated, fresh store.
export function setStorePath(path: string): void {
  db?.close();
  db = openDb(path);
}

export function addFact(fact: Fact): void {
  getDb().run(
    `INSERT INTO facts (id, text, category, storedAt, lastVerifiedAt)
     VALUES (?, ?, ?, ?, ?)`,
    [fact.id, fact.text, fact.category, fact.storedAt, fact.lastVerifiedAt],
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
