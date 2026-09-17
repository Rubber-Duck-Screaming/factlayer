import { check } from "@factlayer/core";
import type { CheckResult, Fact } from "@factlayer/core";
import { toFact } from "./mapper";
import type { Mem0Client, Mem0GetAllOptions } from "./types.ts";

export interface ScannedFact {
  fact: Fact;
  result: CheckResult;
}

// Pulls memories from mem0 via the given client, maps each to a Fact, and
// runs factlayer's check() on it. Read-only: v1 only reports which memories
// are stale, it doesn't write anything back to mem0.
export async function scanMem0(
  client: Mem0Client,
  options?: Mem0GetAllOptions,
  now: number = Date.now(),
): Promise<ScannedFact[]> {
  const { results } = await client.getAll(options);

  return Promise.all(
    results.map(async (memory) => {
      const fact = await toFact(memory, now);
      return { fact, result: check(fact, now) };
    }),
  );
}
