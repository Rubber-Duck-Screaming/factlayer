import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CogneeClient, CogneeDataRecord } from "@factlayer/adapter-cognee";
import type { Mem0Client, Mem0Memory } from "@factlayer/adapter-mem0";
import type { ZepClient, ZepEntityEdge } from "@factlayer/adapter-zep";
import { addFact, getFact, setStorePath } from "@factlayer/core";
import {
  addFactTool,
  checkFreshness,
  markVerifiedTool,
  resolveCogneeApiKey,
  scanCogneeFreshness,
  scanFacts,
  scanMem0Freshness,
  scanZepFreshness,
} from "./tools";

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

describe("add_fact", () => {
  beforeEach(() => {
    setStorePath(":memory:");
  });

  it("adds a fact with an explicit category and returns its id and category", async () => {
    const result = await addFactTool({ text: "I work at Acme Corp", category: "employer" });

    expect(result.structuredContent.category).toBe("employer");
    expect(typeof result.structuredContent.id).toBe("string");
    expect(result.structuredContent.id.length).toBeGreaterThan(0);

    const stored = getFact(result.structuredContent.id);
    expect(stored?.text).toBe("I work at Acme Corp");
    expect(stored?.category).toBe("employer");
    expect(stored?.storedAt).toBe(stored?.lastVerifiedAt);
  });

  it("classifies the category from text when it's omitted", async () => {
    const result = await addFactTool({ text: "I live in Lisbon" });

    expect(result.structuredContent.category).toBe("location");
  });

  it("stores an explicit expiresAt", async () => {
    const expiresAt = Date.now() + 1000;
    const result = await addFactTool({
      text: "Passport number 12345",
      category: "phoneNumber",
      expiresAt,
    });

    const stored = getFact(result.structuredContent.id);
    expect(stored?.expiresAt).toBe(expiresAt);
  });
});

describe("scan_facts", () => {
  const DAY_MS_LOCAL = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    setStorePath(":memory:");
  });

  it("lists stored facts with needs-verification sorted first", async () => {
    const now = Date.now();
    await addFact({
      id: "fresh-1",
      text: "I work at Acme Corp",
      category: "employer",
      storedAt: now,
      lastVerifiedAt: now,
    });
    await addFact({
      id: "stale-1",
      text: "I live in Lisbon",
      category: "location",
      storedAt: now - 200 * DAY_MS_LOCAL,
      lastVerifiedAt: now - 200 * DAY_MS_LOCAL,
    });

    const result = await scanFacts({});

    expect(result.structuredContent.results).toHaveLength(2);
    expect(result.structuredContent.results[0]?.fact.id).toBe("stale-1");
    expect(result.structuredContent.results[0]?.result.status).toBe("needs-verification");
    expect(result.structuredContent.results[1]?.fact.id).toBe("fresh-1");
    expect(result.content[0]?.type).toBe("text");
  });

  it("returns an empty list when no facts are stored", async () => {
    const result = await scanFacts({});

    expect(result.structuredContent.results).toEqual([]);
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

function fakeZepClient(edges: ZepEntityEdge[]): ZepClient {
  return {
    async getByUserId() {
      return edges;
    },
  };
}

describe("scan_zep_freshness", () => {
  beforeEach(() => {
    setStorePath(":memory:");
  });

  it("scans Zep, persists facts locally, and sorts needs-verification first", async () => {
    const now = Date.now();
    const client = fakeZepClient([
      {
        uuid: "edge-fresh",
        fact: "User works at Acme Corp",
        createdAt: new Date(now).toISOString(),
      },
      {
        uuid: "edge-stale",
        fact: "User lives in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS).toISOString(),
      },
    ]);

    const result = await scanZepFreshness({ userId: "alice" }, client);

    expect(result.structuredContent.results).toHaveLength(2);
    expect(result.structuredContent.results[0]?.fact.id).toBe("edge-stale");
    expect(result.structuredContent.results[0]?.result.status).toBe("needs-verification");
    expect(result.content[0]?.type).toBe("text");
  });

  it("persists scanned facts so mark_verified succeeds afterward, instead of Fact not found", async () => {
    const now = Date.now();
    const client = fakeZepClient([
      {
        uuid: "edge-stale",
        fact: "User lives in Lisbon",
        createdAt: new Date(now - 200 * DAY_MS).toISOString(),
      },
    ]);

    await scanZepFreshness({ userId: "alice" }, client);

    const verifyResult = await markVerifiedTool({ id: "edge-stale" });

    expect(verifyResult.isError).toBeUndefined();
    expect(verifyResult.content[0]?.text).toContain("edge-stale");
  });
});

describe("resolveCogneeApiKey", () => {
  const originalToken = process.env.OPENAI_TOKEN;
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.OPENAI_TOKEN;
    else process.env.OPENAI_TOKEN = originalToken;

    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  });

  it("uses OPENAI_TOKEN, not OPENAI_API_KEY, when both are set to different values", () => {
    process.env.OPENAI_TOKEN = "token-value";
    process.env.OPENAI_API_KEY = "api-key-value";

    expect(resolveCogneeApiKey()).toBe("token-value");
  });

  it("falls back to OPENAI_API_KEY when OPENAI_TOKEN is unset", () => {
    delete process.env.OPENAI_TOKEN;
    process.env.OPENAI_API_KEY = "api-key-value";

    expect(resolveCogneeApiKey()).toBe("api-key-value");
  });

  it("returns undefined when neither is set", () => {
    delete process.env.OPENAI_TOKEN;
    delete process.env.OPENAI_API_KEY;

    expect(resolveCogneeApiKey()).toBeUndefined();
  });
});

function fakeCogneeClient(records: CogneeDataRecord[]): CogneeClient {
  return {
    async listData() {
      return records;
    },
  };
}

describe("scan_cognee_freshness", () => {
  let dir: string;
  let fileCounter: number;

  beforeEach(() => {
    setStorePath(":memory:");
    dir = mkdtempSync(join(tmpdir(), "mcp-server-scan-cognee-"));
    fileCounter = 0;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // adapter-cognee's toFact() reads text from a real file at
  // raw_data_location (record.name is an internal hash-based filename, not
  // content -- see adapter-cognee/src/mapper.ts). This writes a real file
  // per record instead of mocking node:fs, same as adapter-cognee's own
  // test suite.
  function writeRecordFile(text: string): string {
    const filePath = join(dir, `text_${fileCounter++}.txt`);
    writeFileSync(filePath, text);
    return `file://${filePath}`;
  }

  it("scans Cognee, persists facts locally, and sorts needs-verification first", async () => {
    const now = Date.now();
    const client = fakeCogneeClient([
      {
        id: "data-fresh",
        name: "text_hash-unrelated-to-content-1",
        raw_data_location: writeRecordFile("User works at Acme Corp"),
        created_at: new Date(now).toISOString(),
        updated_at: null,
        last_accessed: null,
        importance_weight: null,
      },
      {
        id: "data-stale",
        name: "text_hash-unrelated-to-content-2",
        raw_data_location: writeRecordFile("User lives in Lisbon"),
        created_at: new Date(now - 200 * DAY_MS).toISOString(),
        updated_at: null,
        last_accessed: null,
        importance_weight: null,
      },
    ]);

    const result = await scanCogneeFreshness({ datasetId: "dataset-1" }, client);

    expect(result.structuredContent.results).toHaveLength(2);
    expect(result.structuredContent.results[0]?.fact.id).toBe("data-stale");
    expect(result.structuredContent.results[0]?.fact.text).toBe("User lives in Lisbon");
    expect(result.structuredContent.results[0]?.result.status).toBe("needs-verification");
    expect(result.content[0]?.type).toBe("text");
  });

  it("persists scanned facts so mark_verified succeeds afterward, instead of Fact not found", async () => {
    const now = Date.now();
    const client = fakeCogneeClient([
      {
        id: "data-stale",
        name: "text_hash-unrelated-to-content",
        raw_data_location: writeRecordFile("User lives in Lisbon"),
        created_at: new Date(now - 200 * DAY_MS).toISOString(),
        updated_at: null,
        last_accessed: null,
        importance_weight: null,
      },
    ]);

    await scanCogneeFreshness({ datasetId: "dataset-1" }, client);

    const verifyResult = await markVerifiedTool({ id: "data-stale" });

    expect(verifyResult.isError).toBeUndefined();
    expect(verifyResult.content[0]?.text).toContain("data-stale");
  });
});
