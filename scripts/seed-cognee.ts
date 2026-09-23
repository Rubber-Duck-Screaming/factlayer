#!/usr/bin/env bun
// One-off manual seeding script for a live Cognee smoke test. NOT part of
// the automated test suite (bun test never runs this). Ingests and
// extracts three varied facts into the "smoketest" dataset via remember(),
// so scripts/smoke-cognee.ts has something real to scan afterward.
//
// Uses the real @cognee/cognee-ts Cognee class directly, not
// adapter-cognee's DI wrapper -- this script is just seeding data, not
// exercising the adapter.
//
// No zero-cost/no-key path exists for this: cognify() (which remember()
// runs internally) requires a real configured LLM in this package version
// -- confirmed by inspecting the installed .d.ts/README, which document a
// mock provider for EMBEDDING_PROVIDER but nothing equivalent on the LLM
// side. So this script always needs a real OpenAI-compatible key -- here
// pointed at a third-party OpenAI-compatible endpoint rather than OpenAI
// itself. llmModel has been swapped a few times while probing what
// different endpoints actually support (allam-2-7b on the earlier Groq
// endpoint: no tool-calling support; qwen/qwen3.8-27b on the same: request
// rejected over an unsupported "reasoning" property -- both errors reached
// the real endpoint, so neither confirmed a routing/prefix-stripping bug).
// Currently "openai/gpt-4o-mini" against a different endpoint (AICredits),
// specifically to check whether the same slash-prefixed-name issue shows
// up there too.
//
// Both llmApiKey and llmEndpoint are passed explicitly in the settings
// object below rather than left for Cognee to auto-derive. cognee.d.ts's
// own doc comment on the Cognee class confirms settings keys fall back to
// "env-derived defaults" when omitted (i.e. OPENAI_URL alone would work
// for llmEndpoint, same mechanism as OPENAI_TOKEN for llmApiKey) -- but
// passing both explicitly means this script fails fast with a clear error
// if either is missing, instead of silently falling back to Cognee's
// compiled-in default endpoint (OpenAI's), which would reject a
// non-OpenAI model name like this one.
//
// remember() is documented as "ingest + extract in one call", and its
// result type (CogneeRememberResult.status: CogneeRememberStatus) is
// explicitly documented as always resolving to a terminal state
// ("PipelineRunCompleted" / "PipelineRunErrored" / "SessionStored") from
// this synchronous Node binding -- "PipelineRunStarted" exists only for
// symmetry with the async/HTTP background path and is never emitted here.
// So, unlike Zep's async episode processing (see seed-zep.ts), there's no
// separate wait/poll step needed: by the time each `await c.remember(...)`
// below resolves, extraction for that item has already finished.
//
// Usage: OPENAI_TOKEN=... OPENAI_URL=... bun run scripts/seed-cognee.ts
import { Cognee, init } from "@cognee/cognee-ts";

const llmApiKey = process.env.OPENAI_TOKEN;
const llmEndpoint = process.env.OPENAI_URL;
if (!llmApiKey) {
  console.error(
    "Set OPENAI_TOKEN in the environment before running this script.",
  );
  process.exit(1);
}
if (!llmEndpoint) {
  console.error(
    "Set OPENAI_URL in the environment before running this script -- " +
      "this points at a third-party OpenAI-compatible endpoint, not OpenAI's default.",
  );
  process.exit(1);
}

// Cognee's dataset APIs split "name" (this string, chosen by the caller)
// from "id" (a server-assigned UUID) -- see smoke-cognee.ts for where that
// distinction actually matters.
const datasetName = "smoketest";

const facts = [
  "User works at Acme Corp as a backend engineer",
  "User lives in Lisbon",
  "User is currently building a freshness layer for AI agent memory",
];

try {
  init();
  const c = new Cognee({
    llmModel: "openai/gpt-4o-mini",
    llmApiKey,
    llmEndpoint,
  });
  await c.warm();

  console.log(`=== remembering facts into dataset "${datasetName}" ===`);
  for (const text of facts) {
    const result = await c.remember({ type: "text", text }, datasetName);
    console.log(`\n"${text}"`);
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error("seed-cognee failed:", error);
  process.exit(1);
}
