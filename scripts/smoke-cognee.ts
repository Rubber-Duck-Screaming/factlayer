#!/usr/bin/env bun
// One-off manual smoke test against a real Cognee instance. NOT part of
// the automated test suite (bun test never runs this) --
// packages/adapter-cognee's scan.test.ts already covers
// scanCognee()/toFact() against a fake client. This script exists purely
// to eyeball whether Cognee's real datasets.listData() response actually
// matches what toFact() expects, by printing both side by side. Run
// scripts/seed-cognee.ts first so there's real data here to scan.
//
// Same client setup as seed-cognee.ts: init() + new Cognee() + warm(),
// exactly once (client.ts's own guard exists because init() must not be
// called twice per process). scanCognee() itself comes straight from
// adapter-cognee, so this exercises the real adapter's mapping/check
// logic, not a hand-rolled substitute -- the CogneeClient object below is
// just a plain wrapper around the one warmed Cognee instance, the same
// shape createCogneeClient() itself returns.
//
// Cognee's remember()/add()/cognify() take a dataset *name* (a
// human-chosen string, e.g. "smoketest" -- see seed-cognee.ts), but
// datasets.listData() -- what scanCognee() actually calls -- takes the
// dataset's *id* (a server-assigned UUID). Those are different fields on
// CogneeDataset (`name` vs `id`); passing the name where an id is expected
// would silently return nothing rather than erroring. So this script
// resolves "smoketest" to its real id via datasets.list() before scanning,
// instead of assuming the name and id are interchangeable.
//
// Usage: OPENAI_TOKEN=... OPENAI_URL=... bun run scripts/smoke-cognee.ts
import type { CogneeDataset } from "@cognee/cognee-ts";
import { Cognee, init } from "@cognee/cognee-ts";
import { scanCognee } from "../packages/adapter-cognee/src/index";
import type { CogneeClient } from "../packages/adapter-cognee/src/index";

const llmApiKey = process.env.OPENAI_TOKEN;
const llmEndpoint = process.env.OPENAI_URL;
if (!llmApiKey) {
  console.error("Set OPENAI_TOKEN in the environment before running this script.");
  process.exit(1);
}
if (!llmEndpoint) {
  console.error(
    "Set OPENAI_URL in the environment before running this script -- " +
      "this points at a third-party OpenAI-compatible endpoint, not OpenAI's default.",
  );
  process.exit(1);
}

const datasetName = "smoketest";

try {
  init();
  // warm() builds the LLM engine from this config even though listData()
  // itself never calls the LLM -- so this still needs the same
  // llmModel/llmEndpoint/llmApiKey as seed-cognee.ts. Whether warm() would
  // actually reject a mismatched model/endpoint pair immediately isn't
  // confirmed from the .d.ts (its doc comment just says it "builds
  // embedding/LLM engines"), so matching seed-cognee.ts's config exactly
  // is the safe choice rather than assuming either way.
  const c = new Cognee({ llmModel: "openai/gpt-4o-mini", llmApiKey, llmEndpoint });
  await c.warm();

  const datasets = await c.datasets.list();
  const dataset = datasets.find((d: CogneeDataset) => d.name === datasetName);
  if (!dataset) {
    console.error(
      `No dataset named "${datasetName}" found. Run scripts/seed-cognee.ts first.`,
    );
    process.exit(1);
  }

  const client: CogneeClient = {
    listData: (datasetId: string) => c.datasets.listData(datasetId),
  };

  const raw = await client.listData(dataset.id);
  console.log("=== raw Cognee datasets.listData() response (before mapping) ===");
  console.log(JSON.stringify(raw, null, 2));

  const scanned = await scanCognee(client, dataset.id);
  console.log("\n=== mapped Facts (after mapping) ===");
  console.log(JSON.stringify(scanned.map((s) => s.fact), null, 2));
} catch (error) {
  console.error("smoke-cognee failed:", error);
  process.exit(1);
}
