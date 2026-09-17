import { classify } from "@factlayer/core";
import type { Fact } from "@factlayer/core";
import type { Mem0Memory } from "./types.ts";

function toMs(value: Date | string | undefined, fallback: number): number {
  if (value == null) return fallback;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? fallback : ms;
}

function parseExpiresAt(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

// Converts a mem0 memory into a factlayer Fact.
//
// - storedAt comes from createdAt, lastVerifiedAt from updatedAt (mem0 has
//   no separate "verified" concept, so the last time the memory was touched
//   is the closest available signal).
// - category always comes from classify() on the memory text. mem0's own
//   `categories` are a general, freeform tagging system unrelated to
//   factlayer's fixed freshness taxonomy, so they're intentionally ignored
//   here.
// - expiresAt maps directly from mem0's expirationDate when present.
export async function toFact(memory: Mem0Memory, now: number = Date.now()): Promise<Fact> {
  const text = memory.memory ?? "";
  const storedAt = toMs(memory.createdAt, now);
  const lastVerifiedAt = toMs(memory.updatedAt, storedAt);

  return {
    id: memory.id,
    text,
    category: await classify(text),
    storedAt,
    lastVerifiedAt,
    expiresAt: parseExpiresAt(memory.expirationDate),
  };
}
