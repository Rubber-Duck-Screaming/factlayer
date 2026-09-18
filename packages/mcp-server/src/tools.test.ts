import { beforeEach, describe, expect, it } from "bun:test";
import type { Mem0Client, Mem0Memory } from "@factlayer/adapter-mem0";
import { addFact, setStorePath } from "@factlayer/core";
import { checkFreshness, markVerifiedTool, scanMem0Freshness } from "./tools";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("check_freshness", () => {
  it("returns fresh for a recently verified fact", async () => {
    const now = Date.now();
    const result = await checkFreshness({
      text: "I live in Lisbon",
      category: "location",
      storedAt: now,
      lastVerifiedAt: now,
    });

    expect(result.structuredContent.status).toBe("fresh");
    expect(result.content[0]?.type).toBe("text");
    expect(JSON.parse(result.content[0]!.text)).toEqual(result.structuredContent);
  });

  it("returns needs-verification for a fact past its category's half-life", async () => {
    const now = Date.now();
    const result = await checkFreshness({
      text: "I live in Lisbon",
      category: "location",
      storedAt: now - 200 * DAY_MS,
      lastVerifiedAt: now - 200 * DAY_MS,
    });

    expect(result.structuredContent.status).toBe("needs-verification");
  });

  it("classifies the category from text when it's omitted", async () => {
    const now = Date.now();
    const result = await checkFreshness({
      text: "I work at Acme Corp",
      storedAt: now,
      lastVerifiedAt: now,
    });

    expect(result.structuredContent.thresholdInDays).toBe(365); // employer half-life
  });

  it("honors an explicit expiresAt over the category half-life", async () => {
    const now = Date.now();
    const result = await checkFreshness({
      text: "Passport number 12345",
      category: "phoneNumber", // 3650-day half-life, would otherwise be fresh
      storedAt: now - 1 * DAY_MS,
      lastVerifiedAt: now - 1 * DAY_MS,
      expiresAt: now - 1000, // expired a moment ago
    });

    expect(result.structuredContent.status).toBe("needs-verification");
  });
});

describe("mark_verified", () => {
  beforeEach(() => {
    setStorePath(":memory:");
  });

  it("marks a stored fact verified and confirms with a message", async () => {
    const now = Date.now();
    await addFact({
      id: "fact-1",
      text: "I work at Acme Corp",
      category: "employer",
      storedAt: now - 400 * DAY_MS,
      lastVerifiedAt: now - 400 * DAY_MS,
    });

    const result = await markVerifiedTool({ id: "fact-1" });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toContain("fact-1");
    expect(result.content[0]?.text).toContain("employer");
  });

  it("returns an error result instead of throwing when the id doesn't exist", async () => {
    const result = await markVerifiedTool({ id: "does-not-exist" });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("does-not-exist");
  });
});

function fakeMem0Client(memories: Mem0Memory[]): Mem0Client {
  return {
    async getAll() {
      return { results: memories };
    },
  };
}

describe("scan_mem0_freshness", () => {
  beforeEach(() => {
    setStorePath(":memory:");
  });

  it("scans mem0, persists facts locally, and sorts needs-verification first", async () => {
    const now = Date.now();
    const client = fakeMem0Client([
      {
        id: "mem-fresh",
        memory: "I work at Acme Corp",
        createdAt: new Date(now),
        updatedAt: new Date(now),
      },
      {
        id: "mem-stale",
        memory: "I live in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS),
        updatedAt: new Date(now - 200 * DAY_MS),
      },
    ]);

    const result = await scanMem0Freshness({ userId: "alice" }, client);

    expect(result.structuredContent.results).toHaveLength(2);
    expect(result.structuredContent.results[0]?.fact.id).toBe("mem-stale");
    expect(result.structuredContent.results[0]?.result.status).toBe("needs-verification");
    expect(result.content[0]?.type).toBe("text");
  });

  it("persists scanned facts so mark_verified succeeds afterward, instead of Fact not found", async () => {
    const now = Date.now();
    const client = fakeMem0Client([
      {
        id: "mem-stale",
        memory: "I live in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS),
        updatedAt: new Date(now - 200 * DAY_MS),
      },
    ]);

    await scanMem0Freshness({ userId: "alice" }, client);

    const verifyResult = await markVerifiedTool({ id: "mem-stale" });

    expect(verifyResult.isError).toBeUndefined();
    expect(verifyResult.content[0]?.text).toContain("mem-stale");
  });
});
