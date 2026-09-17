import { MemoryClient } from "mem0ai";
import type { Mem0Client, Mem0GetAllOptions } from "./types.ts";

// Wraps the real mem0ai MemoryClient so it satisfies the minimal Mem0Client
// shape scanMem0() depends on. Keeping scan.ts decoupled from MemoryClient
// itself is what lets the automated test suite inject a fake client instead
// of making real network calls (see scan.test.ts). This file is exercised
// only by a manual smoke test against the live mem0 API, not by `bun test`.
export function createMem0Client(apiKey: string, host?: string): Mem0Client {
  const client = new MemoryClient({ apiKey, host });
  return {
    getAll: (options?: Mem0GetAllOptions) => client.getAll(options),
  };
}
