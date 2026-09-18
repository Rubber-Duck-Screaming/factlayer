#!/usr/bin/env bun
// Manual end-to-end smoke test for the mcp-server scan_mem0_freshness tool:
// scans a real mem0 account (mem0 -> map -> persist locally -> check), then
// calls mark_verified on the first result to confirm the id it returns
// actually resolves in the local store afterward. NOT part of the automated
// test suite -- packages/mcp-server/src/tools.test.ts already covers both
// tools against a fake mem0 client.
//
// Usage: MEM0_API_KEY=... bun run scripts/smoke-scan-mem0-freshness.ts
import { markVerifiedTool, scanMem0Freshness } from "../packages/mcp-server/src/tools";

if (!process.env.MEM0_API_KEY) {
  console.error("Set MEM0_API_KEY in the environment before running this script.");
  process.exit(1);
}

try {
  const scan = await scanMem0Freshness({ userId: "smoketest" });
  console.log("=== scan_mem0_freshness result ===");
  console.log(scan.content[0]?.text);

  const results = scan.structuredContent.results;
  if (results.length === 0) {
    console.log("\nNo memories found for user_id 'smoketest' -- nothing to verify.");
    process.exit(0);
  }

  const target = results[0]!;
  console.log(`\n=== mark_verified("${target.fact.id}") ===`);
  const verify = await markVerifiedTool({ id: target.fact.id });
  console.log(verify.content[0]?.text);
  if (verify.isError) {
    console.error("mark_verified returned an error -- the id didn't resolve.");
    process.exit(1);
  }
} catch (error) {
  console.error("smoke-scan-mem0-freshness failed:", error);
  process.exit(1);
}
