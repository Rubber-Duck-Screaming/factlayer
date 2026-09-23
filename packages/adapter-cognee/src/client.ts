import { Cognee, init } from "@cognee/cognee-ts";
import type { CogneeClient } from "./types.ts";

let initialized = false;

// Boots the Rust async runtime that every Cognee pipeline call depends on
// (Cognee's own usage notes call this out as required once per process,
// before any async op). Guarded here rather than left to callers, so
// createCogneeClient can be called more than once -- e.g. once per scan --
// without re-initializing the runtime.
function ensureInit(): void {
  if (!initialized) {
    init();
    initialized = true;
  }
}

// Wraps the real @cognee/cognee-ts Cognee class so it satisfies the minimal
// CogneeClient shape scanCognee() depends on. Keeping scan.ts decoupled
// from the real SDK class is what lets the automated test suite inject a
// fake client instead of making real (LLM/embedding-backed) calls (see
// scan.test.ts). This file is exercised only by a manual smoke test
// against a real Cognee instance, not by `bun test`.
//
// Async (unlike adapter-mem0/adapter-zep's sync client factories) because
// Cognee's own docs require warm() -- which builds the embedding/LLM
// engines and resolves the default user -- to run once after construction
// and before any other call.
export async function createCogneeClient(settings?: object | string): Promise<CogneeClient> {
  ensureInit();
  const client = new Cognee(settings);
  await client.warm();
  return {
    listData: (datasetId: string) => client.datasets.listData(datasetId),
  };
}
