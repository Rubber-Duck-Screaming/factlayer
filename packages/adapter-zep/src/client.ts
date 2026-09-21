import { ZepClient as RealZepClient } from "@getzep/zep-cloud";
import type { ZepClient, ZepGraphEdgesRequest } from "./types.ts";

// Wraps the real @getzep/zep-cloud ZepClient so it satisfies the minimal
// ZepClient shape scanZep() depends on. Keeping scan.ts decoupled from the
// real SDK client is what lets the automated test suite inject a fake
// client instead of making real network calls (see scan.test.ts). This file
// is exercised only by a manual smoke test against the live Zep API, not by
// `bun test`.
export function createZepClient(apiKey: string): ZepClient {
  const client = new RealZepClient({ apiKey });
  return {
    getByUserId: (userId: string, request: ZepGraphEdgesRequest) =>
      client.graph.edge.getByUserId(userId, request),
  };
}
