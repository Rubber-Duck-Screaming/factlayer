import { beforeEach, describe, expect, it } from "bun:test";
import { getFact, markVerified, setStorePath } from "@factlayer/core";
import { scanZep } from "./scan";
import type { ZepClient, ZepEntityEdge } from "./types.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

// A fake Zep client with the same shape as the real one (see client.ts) --
// no network access, fully deterministic.
function fakeClient(edges: ZepEntityEdge[]): ZepClient & { lastUserId?: string } {
  const client: ZepClient & { lastUserId?: string } = {
    async getByUserId(userId) {
      client.lastUserId = userId;
      return edges;
    },
  };
  return client;
}

describe("scanZep", () => {
  beforeEach(() => {
    setStorePath(":memory:");
  });

  it("maps and checks every edge returned by the client", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        uuid: "stale-1",
        fact: "User lives in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS).toISOString(),
      },
      {
        uuid: "fresh-1",
        fact: "User works at Acme Corp",
        createdAt: new Date(now).toISOString(),
      },
    ]);

    const scanned = await scanZep(client, "alice", now);

    expect(scanned).toHaveLength(2);

    const stale = scanned.find((s) => s.fact.id === "stale-1");
    expect(stale?.fact.category).toBe("location");
    expect(stale?.result.status).toBe("needs-verification");

    const fresh = scanned.find((s) => s.fact.id === "fresh-1");
    expect(fresh?.fact.category).toBe("employer");
    expect(fresh?.result.status).toBe("fresh");
  });

  it("passes the userId through to the client", async () => {
    const client = fakeClient([]);

    await scanZep(client, "alice");

    expect(client.lastUserId).toBe("alice");
  });

  it("returns an empty list when Zep returns no edges", async () => {
    const scanned = await scanZep(fakeClient([]), "alice");

    expect(scanned).toEqual([]);
  });

  it("reports needs-verification immediately for a Zep-invalidated fact, regardless of age", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        uuid: "invalidated-1",
        fact: "User lives in Berlin",
        createdAt: new Date(now - 1 * DAY_MS).toISOString(), // 1 day old, well under location's half-life
        invalidAt: new Date(now - 1000).toISOString(), // Zep flagged it invalid a moment ago
      },
    ]);

    const [scanned] = await scanZep(client, "alice", now);

    expect(scanned?.result.status).toBe("needs-verification");
  });

  it("persists each scanned edge locally, keyed by Zep's own edge uuid", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        uuid: "edge-1",
        fact: "User lives in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS).toISOString(),
      },
    ]);

    await scanZep(client, "alice", now);

    const stored = getFact("edge-1");
    expect(stored?.text).toBe("User lives in Lisbon");
    expect(stored?.category).toBe("location");
  });

  it("lets mark_verified succeed on an id returned by a scan, instead of Fact not found", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        uuid: "edge-1",
        fact: "User lives in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS).toISOString(),
      },
    ]);

    const [scanned] = await scanZep(client, "alice", now);
    expect(scanned?.result.status).toBe("needs-verification");

    markVerified("edge-1", now);

    const verified = getFact("edge-1");
    expect(verified?.lastVerifiedAt).toBe(now);
  });
});
