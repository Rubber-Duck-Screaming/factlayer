import { addFact, check } from "@factlayer/core";
import type { CheckResult, Fact } from "@factlayer/core";
import { toFact } from "./mapper";
import type { ZepClient } from "./types.ts";

export interface ScannedFact {
  fact: Fact;
  result: CheckResult;
}

// Pulls facts (Zep's "entity edges") for a user via graph.edge.getByUserId()
// -- a direct listing, not a relevance-ranked search -- maps each to a
// Fact, persists it locally (upserted via addFact, keyed by Zep's own edge
// uuid so the two systems share one id space), and runs factlayer's
// check() on it. Never writes anything back to Zep itself -- only to
// factlayer's local store, which is what lets mark_verified act on
// Zep-sourced facts afterward.
export async function scanZep(
  client: ZepClient,
  userId: string,
  now: number = Date.now(),
): Promise<ScannedFact[]> {
  const edges = await client.getByUserId(userId, {});

  return Promise.all(
    edges.map(async (edge) => {
      const fact = await toFact(edge, now);
      await addFact(fact);
      return { fact, result: check(fact, now) };
    }),
  );
}
