import { describe, expect, it } from "bun:test";
import { scanMem0 } from "./scan";
import type { Mem0Client, Mem0GetAllOptions, Mem0Memory } from "./types.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

// A fake mem0 client with the same shape as the real one (see client.ts) —
// no network access, fully deterministic.
function fakeClient(memories: Mem0Memory[]): Mem0Client & { lastOptions?: Mem0GetAllOptions } {
  const client: Mem0Client & { lastOptions?: Mem0GetAllOptions } = {
    async getAll(options) {
      client.lastOptions = options;
      return { results: memories };
    },
  };
  return client;
}

describe("scanMem0", () => {
  it("maps and checks every memory returned by the client", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        id: "stale-1",
        memory: "I live in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS),
        updatedAt: new Date(now - 200 * DAY_MS),
      },
      {
        id: "fresh-1",
        memory: "I work at Acme Corp",
        createdAt: new Date(now),
        updatedAt: new Date(now),
      },
    ]);

    const scanned = await scanMem0(client, undefined, now);

    expect(scanned).toHaveLength(2);

    const stale = scanned.find((s) => s.fact.id === "stale-1");
    expect(stale?.fact.category).toBe("location");
    expect(stale?.result.status).toBe("needs-verification");

    const fresh = scanned.find((s) => s.fact.id === "fresh-1");
    expect(fresh?.fact.category).toBe("employer");
    expect(fresh?.result.status).toBe("fresh");
  });

  it("passes filter options straight through to the client", async () => {
    const client = fakeClient([]);

    await scanMem0(client, { filters: { user_id: "alice" } });

    expect(client.lastOptions).toEqual({ filters: { user_id: "alice" } });
  });

  it("honors mem0's expirationDate over the category half-life", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        id: "expired-1",
        memory: "Passport number 12345", // phoneNumber category, 3650-day half-life
        createdAt: new Date(now - 1 * DAY_MS),
        updatedAt: new Date(now - 1 * DAY_MS),
        expirationDate: new Date(now - 1000).toISOString(), // expired a moment ago
      },
    ]);

    const [scanned] = await scanMem0(client, undefined, now);

    expect(scanned?.result.status).toBe("needs-verification");
  });
});
