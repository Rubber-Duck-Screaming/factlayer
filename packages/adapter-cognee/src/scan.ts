import { addFact, check } from "@factlayer/core";
import type { CheckResult } from "@factlayer/core";
import { toFact } from "./mapper";
import type { CogneeFact } from "./mapper.ts";
import type { CogneeClient } from "./types.ts";

export interface ScannedFact {
  fact: CogneeFact;
  result: CheckResult;
}

// Pulls raw ingested records for a dataset via datasets.listData() -- see
// mapper.ts's design note for why this is source material, not extracted
// graph facts -- maps each to a Fact, persists it locally (upserted via
// addFact, keyed by Cognee's own data id so the two systems share one id
// space), and runs factlayer's check() on it. Never writes anything back to
// Cognee itself -- only to factlayer's local store, which is what lets
// mark_verified act on Cognee-sourced facts afterward.
export async function scanCognee(
  client: CogneeClient,
  datasetId: string,
  now: number = Date.now(),
): Promise<ScannedFact[]> {
  const records = await client.listData(datasetId);

  return Promise.all(
    records.map(async (record) => {
      const fact = await toFact(record, now);
      await addFact(fact);
      return { fact, result: check(fact, now) };
    }),
  );
}
