import { addFact, check } from "@factlayer/core";
import type { CheckResult, Fact } from "@factlayer/core";
import { toFact } from "./mapper";
import type { Mem0Client, Mem0GetAllOptions } from "./types.ts";

export interface ScannedFact {
  fact: Fact;
  result: CheckResult;
}

// Pulls memories from mem0 via the given client, maps each to a Fact,
// persists it locally (upserted via addFact, keyed by mem0's own id so the
// two systems share one id space), and runs factlayer's check() on it.
// Never writes anything back to mem0 itself -- only to factlayer's local
// store, which is what lets mark_verified act on mem0-sourced facts
// afterward.
export async function scanMem0(
  client: Mem0Client,
  options?: Mem0GetAllOptions,
  now: number = Date.now(),
): Promise<ScannedFact[]> {
  const { results } = await client.getAll(options);

  return Promise.all(
    results.map(async (memory) => {
      const fact = await toFact(memory, now);
      await addFact(fact);
      return { fact, result: check(fact, now) };
    }),
  );
}
