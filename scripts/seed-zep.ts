#!/usr/bin/env bun
// One-off manual seeding script for a live Zep smoke test. NOT part of the
// automated test suite (bun test never runs this). Creates a "smoketest"
// Zep user (safely re-runnable -- ignores the conflict if it already
// exists) and adds a few varied facts to that user's graph, so
// scripts/smoke-zep.ts has something real to scan afterward.
//
// Uses the real @getzep/zep-cloud client directly, not adapter-zep's DI
// wrapper -- this script is just seeding data, not exercising the adapter.
//
// Usage: ZEP_API_KEY=... bun run scripts/seed-zep.ts
import { Zep, ZepClient } from "@getzep/zep-cloud";

const apiKey = process.env.ZEP_API_KEY;
if (!apiKey) {
  console.error(
    "Set ZEP_API_KEY in the environment before running this script.",
  );
  process.exit(1);
}

const client = new ZepClient({ apiKey });
const userId = "smoketest";

try {
  try {
    await client.user.add({ userId });
    console.log(`Created user "${userId}".`);
  } catch (error) {
    if (error instanceof Zep.ConflictError) {
      console.log(`User "${userId}" already exists -- reusing it.`);
    } else {
      throw error;
    }
  }

  const facts = [
    "User works at Acme Corp as a backend engineer",
    "User lives in Lisbon",
    "User is currently building a freshness layer for AI agent memory",
  ];

  console.log("\n=== adding facts to the graph ===");
  for (const data of facts) {
    const episode = await client.graph.add({ userId, type: "text", data });
    console.log(`episode ${episode.uuid}: "${data}"`);
  }

  console.log(
    "\nGraph processing is async -- these facts won't show up in a search or " +
      `getByUserId call until Zep finishes extracting them. Check the Zep ` +
      `dashboard's "View Episodes" for user "${userId}" and confirm all three ` +
      "have finished processing before running scripts/smoke-zep.ts.",
  );
} catch (error) {
  console.error("seed-zep failed:", error);
  process.exit(1);
}
