import { classify } from "@factlayer/core";
import type { Fact } from "@factlayer/core";
import type { ZepEntityEdge } from "./types.ts";

function toMs(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? fallback : ms;
}

// Earliest of invalidAt/expiredAt that parses -- either one is Zep's own
// bi-temporal signal that the fact is no longer current, so whichever fired
// first is when the fact actually went stale.
function earliestInvalidation(edge: ZepEntityEdge): number | null {
  const candidates = [edge.invalidAt, edge.expiredAt]
    .map((value) => (value ? Date.parse(value) : NaN))
    .filter((ms) => !Number.isNaN(ms));
  return candidates.length > 0 ? Math.min(...candidates) : null;
}

// Converts a Zep entity edge (Zep's unit of stored knowledge -- effectively
// "the fact") into a factlayer Fact.
//
// - storedAt prefers validAt (when the fact became true in the real world)
//   and falls back to createdAt (when Zep's graph recorded the edge) when
//   validAt is absent. lastVerifiedAt matches whichever one was used. Zep
//   has no separate "last verified" concept.
// - category always comes from classify() on the fact text -- Zep doesn't
//   expose a comparable freeform category on edges.
// - When Zep has already flagged the edge via invalidAt or expiredAt (its
//   own bi-temporal signal that the fact is no longer current), that maps
//   straight to expiresAt so check() reports needs-verification
//   immediately, without running the category half-life math at all.
export async function toFact(edge: ZepEntityEdge, now: number = Date.now()): Promise<Fact> {
  const text = edge.fact;
  const storedAt = toMs(edge.validAt, toMs(edge.createdAt, now));

  return {
    id: edge.uuid,
    text,
    category: await classify(text),
    storedAt,
    lastVerifiedAt: storedAt,
    expiresAt: earliestInvalidation(edge),
  };
}
