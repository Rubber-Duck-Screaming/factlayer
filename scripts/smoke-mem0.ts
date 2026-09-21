#!/usr/bin/env bun
// One-off manual smoke test against the real mem0 API. NOT part of the
// automated test suite (bun test never runs this) -- packages/adapter-mem0's
// scan.test.ts already covers scanMem0()/toFact() against a fake client.
// This script exists purely to eyeball whether mem0's real getAll() response
// actually matches what toFact() expects, by printing both side by side.
//
// Usage: MEM0_API_KEY=... bun run scripts/smoke-mem0.ts
import { createMem0Client, scanMem0 } from "../packages/adapter-mem0/src/index";

const apiKey = process.env.MEM0_API_KEY;
if (!apiKey) {
  console.error(
    "Set MEM0_API_KEY in the environment before running this script.",
  );
  process.exit(1);
}

const client = createMem0Client(apiKey);
const filters = { user_id: "smoketest" };

try {
  const raw = await client.getAll({ filters });
  console.log("=== raw mem0 response (before mapping) ===");
  console.log(JSON.stringify(raw, null, 2));

  const scanned = await scanMem0(client, { filters });
  console.log("\n=== mapped Facts (after mapping) ===");
  console.log(
    JSON.stringify(
      scanned.map((s) => s.fact),
      null,
      2,
    ),
  );
} catch (error) {
  console.error("smoke-mem0 failed:", error);
  process.exit(1);
}
