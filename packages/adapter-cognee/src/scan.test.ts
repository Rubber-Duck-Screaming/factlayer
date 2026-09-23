import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getFact, markVerified, setStorePath } from "@factlayer/core";
import { scanCognee } from "./scan";
import type { CogneeClient, CogneeDataRecord } from "./types.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

// A fake Cognee client with the same shape as the real one (see client.ts)
// -- no native/LLM/embedding calls, fully deterministic.
function fakeClient(records: CogneeDataRecord[]): CogneeClient & { lastDatasetId?: string } {
  const client: CogneeClient & { lastDatasetId?: string } = {
    async listData(datasetId) {
      client.lastDatasetId = datasetId;
      return records;
    },
  };
  return client;
}

describe("scanCognee", () => {
  let dir: string;
  let fileCounter: number;

  beforeEach(() => {
    setStorePath(":memory:");
    dir = mkdtempSync(join(tmpdir(), "adapter-cognee-scan-"));
    fileCounter = 0;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // toFact() reads text from a real file at raw_data_location (record.name
  // is an internal hash-based filename, not content -- see mapper.ts). This
  // writes a real file per record instead of mocking node:fs, so the
  // file:// URI handling is exercised for real, same as mapper.test.ts.
  function writeRecordFile(text: string): string {
    const filePath = join(dir, `text_${fileCounter++}.txt`);
    writeFileSync(filePath, text);
    return `file://${filePath}`;
  }

  it("maps and checks every record returned by the client", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        id: "stale-1",
        name: "text_hash-unrelated-to-content-1",
        raw_data_location: writeRecordFile("User lives in Lisbon"),
        created_at: new Date(now - 200 * DAY_MS).toISOString(),
        updated_at: null,
        last_accessed: null,
        importance_weight: null,
      },
      {
        id: "fresh-1",
        name: "text_hash-unrelated-to-content-2",
        raw_data_location: writeRecordFile("User works at Acme Corp"),
        created_at: new Date(now).toISOString(),
        updated_at: null,
        last_accessed: null,
        importance_weight: null,
      },
    ]);

    const scanned = await scanCognee(client, "dataset-1", now);

    expect(scanned).toHaveLength(2);

    const stale = scanned.find((s) => s.fact.id === "stale-1");
    expect(stale?.fact.text).toBe("User lives in Lisbon");
    expect(stale?.fact.category).toBe("location");
    expect(stale?.result.status).toBe("needs-verification");

    const fresh = scanned.find((s) => s.fact.id === "fresh-1");
    expect(fresh?.fact.text).toBe("User works at Acme Corp");
    expect(fresh?.fact.category).toBe("employer");
    expect(fresh?.result.status).toBe("fresh");
  });

  it("passes the datasetId through to the client", async () => {
    const client = fakeClient([]);

    await scanCognee(client, "dataset-1");

    expect(client.lastDatasetId).toBe("dataset-1");
  });

  it("returns an empty list when the dataset has no records", async () => {
    const scanned = await scanCognee(fakeClient([]), "dataset-1");

    expect(scanned).toEqual([]);
  });

  it("falls back to created_at when a record's updated_at is null", async () => {
    const now = Date.now();
    const createdAt = new Date(now - 50 * DAY_MS).toISOString();
    const client = fakeClient([
      {
        id: "no-update-1",
        name: "text_hash-unrelated-to-content",
        raw_data_location: writeRecordFile("User lives in Berlin"),
        created_at: createdAt,
        updated_at: null,
        last_accessed: null,
        importance_weight: null,
      },
    ]);

    const [scanned] = await scanCognee(client, "dataset-1", now);

    expect(scanned?.fact.lastVerifiedAt).toBe(Date.parse(createdAt));
    expect(scanned?.fact.lastVerifiedAt).toBe(scanned?.fact.storedAt);
  });

  it("persists each scanned record locally, keyed by Cognee's own data id", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        id: "data-1",
        name: "text_hash-unrelated-to-content",
        raw_data_location: writeRecordFile("User lives in Lisbon"),
        created_at: new Date(now - 200 * DAY_MS).toISOString(),
        updated_at: null,
        last_accessed: null,
        importance_weight: null,
      },
    ]);

    await scanCognee(client, "dataset-1", now);

    const stored = getFact("data-1");
    expect(stored?.text).toBe("User lives in Lisbon");
    expect(stored?.category).toBe("location");
  });

  it("lets mark_verified succeed on an id returned by a scan, instead of Fact not found", async () => {
    const now = Date.now();
    const client = fakeClient([
      {
        id: "data-1",
        name: "text_hash-unrelated-to-content",
        raw_data_location: writeRecordFile("User lives in Lisbon"),
        created_at: new Date(now - 200 * DAY_MS).toISOString(),
        updated_at: null,
        last_accessed: null,
        importance_weight: null,
      },
    ]);

    const [scanned] = await scanCognee(client, "dataset-1", now);
    expect(scanned?.result.status).toBe("needs-verification");

    markVerified("data-1", now);

    const verified = getFact("data-1");
    expect(verified?.lastVerifiedAt).toBe(now);
  });
});
