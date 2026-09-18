import { beforeEach, describe, expect, it } from "bun:test";
import { getFact, markVerified, setStorePath } from "@factlayer/core";
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
  beforeEach(() => {
    setStorePath(":memory:");
  });

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

  it("persists each scanned memory locally, keyed by mem0's own id", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        id: "mem-1",
        memory: "I live in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS),
        updatedAt: new Date(now - 200 * DAY_MS),
      },
    ]);

    await scanMem0(client, undefined, now);

    const stored = getFact("mem-1");
    expect(stored?.text).toBe("I live in Lisbon");
    expect(stored?.category).toBe("location");
  });

  it("updates the local fact instead of erroring on a repeat scan of the same id", async () => {
    const now = Date.now();
    const memory: Mem0Memory = {
      id: "mem-1",
      memory: "I live in Lisbon",
      createdAt: new Date(now - 200 * DAY_MS),
      updatedAt: new Date(now - 200 * DAY_MS),
    };

    await scanMem0(fakeClient([memory]), undefined, now);
    await scanMem0(
      fakeClient([{ ...memory, memory: "I live in Porto", updatedAt: new Date(now) }]),
      undefined,
      now,
    );

    const stored = getFact("mem-1");
    expect(stored?.text).toBe("I live in Porto");
    expect(stored?.lastVerifiedAt).toBe(now);
  });

  it("lets mark_verified succeed on an id returned by a scan, instead of Fact not found", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        id: "mem-1",
        memory: "I live in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS),
        updatedAt: new Date(now - 200 * DAY_MS),
      },
    ]);

    const [scanned] = await scanMem0(client, undefined, now);
    expect(scanned?.result.status).toBe("needs-verification");

    markVerified("mem-1", now);

    const verified = getFact("mem-1");
    expect(verified?.lastVerifiedAt).toBe(now);
  });
});
