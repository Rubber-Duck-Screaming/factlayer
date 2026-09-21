#!/usr/bin/env bun
// One-off manual smoke test against the real Zep API. NOT part of the
// automated test suite (bun test never runs this) -- packages/adapter-zep's
// scan.test.ts already covers scanZep()/toFact() against a fake client.
// This script exists purely to eyeball whether Zep's real getByUserId()
// response actually matches what toFact() expects, by printing both side by
// side. Run scripts/seed-zep.ts first (and confirm episode processing has
// finished) so there's real data here to scan.
//
// Usage: ZEP_API_KEY=... bun run scripts/smoke-zep.ts
import { createZepClient, scanZep } from "../packages/adapter-zep/src/index";

const apiKey = process.env.ZEP_API_KEY;
if (!apiKey) {
  console.error("Set ZEP_API_KEY in the environment before running this script.");
  process.exit(1);
}

const client = createZepClient(apiKey);
const userId = "smoketest";

try {
  const raw = await client.getByUserId(userId, {});
  console.log("=== raw Zep getByUserId response (before mapping) ===");
  console.log(JSON.stringify(raw, null, 2));

  const scanned = await scanZep(client, userId);
  console.log("\n=== mapped Facts (after mapping) ===");
  console.log(JSON.stringify(scanned.map((s) => s.fact), null, 2));
} catch (error) {
  console.error("smoke-zep failed:", error);
  process.exit(1);
}
