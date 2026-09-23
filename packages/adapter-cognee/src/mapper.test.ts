import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toFact } from "./mapper";
import type { CogneeDataRecord } from "./types.ts";

// toFact() reads text from a real file at raw_data_location (see
// mapper.ts's design note -- record.name is an internal hash-based
// filename, not fact content). These tests write real files to a temp dir
// and point raw_data_location at them, rather than mocking node:fs, so the
// file:// URI handling (including Windows' mixed-slash quirk) is exercised
// for real.
describe("toFact", () => {
  let dir: string;
  let fileCounter: number;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "adapter-cognee-mapper-"));
    fileCounter = 0;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeRecordFile(text: string): string {
    const filePath = join(dir, `text_${fileCounter++}.txt`);
    writeFileSync(filePath, text);
    return `file://${filePath}`;
  }

  it("maps a normal record, reading text from the file at raw_data_location", async () => {
    const record: CogneeDataRecord = {
      id: "data-1",
      name: "text_b746e53fca48a4c932a25ac28fbdb0c2", // internal hash-based filename, not content
      raw_data_location: writeRecordFile("User works at Acme Corp"),
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-05T00:00:00.000Z",
      last_accessed: "2026-01-20T00:00:00.000Z",
      importance_weight: 0.8,
    };

    const fact = await toFact(record);

    expect(fact.id).toBe("data-1");
    expect(fact.text).toBe("User works at Acme Corp");
    expect(fact.category).toBe("employer");
    expect(fact.storedAt).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
    expect(fact.lastVerifiedAt).toBe(Date.parse("2026-01-05T00:00:00.000Z"));
    expect(fact.expiresAt).toBeNull();
    expect(fact.importanceWeight).toBe(0.8);
  });

  it("reads text from the file, not from record.name", async () => {
    const record: CogneeDataRecord = {
      id: "data-name-mismatch",
      name: "text_totally-unrelated-hash", // deliberately doesn't match the file's content
      raw_data_location: writeRecordFile("User lives in Lisbon"),
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: null,
      last_accessed: null,
      importance_weight: null,
    };

    const fact = await toFact(record);

    expect(fact.text).toBe("User lives in Lisbon");
    expect(fact.text).not.toBe(record.name);
  });

  it("trims trailing whitespace/newlines from the file's content", async () => {
    const record: CogneeDataRecord = {
      id: "data-trim",
      name: "text_x",
      raw_data_location: writeRecordFile("User lives in Porto\n"),
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: null,
      last_accessed: null,
      importance_weight: null,
    };

    const fact = await toFact(record);

    expect(fact.text).toBe("User lives in Porto");
  });

  it("falls back to created_at for lastVerifiedAt when updated_at is null", async () => {
    const record: CogneeDataRecord = {
      id: "data-2",
      name: "text_x",
      raw_data_location: writeRecordFile("User lives in Lisbon"),
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: null,
      last_accessed: null,
      importance_weight: null,
    };

    const fact = await toFact(record);

    expect(fact.storedAt).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
    expect(fact.lastVerifiedAt).toBe(fact.storedAt);
  });

  it("never uses last_accessed for lastVerifiedAt, even when it's the most recent timestamp", async () => {
    const record: CogneeDataRecord = {
      id: "data-3",
      name: "text_x",
      raw_data_location: writeRecordFile("User lives in Porto"),
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: null,
      last_accessed: "2026-02-01T00:00:00.000Z", // recent access, but not a verification
      importance_weight: null,
    };

    const fact = await toFact(record);

    expect(fact.lastVerifiedAt).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
    expect(fact.lastVerifiedAt).not.toBe(Date.parse("2026-02-01T00:00:00.000Z"));
  });

  it("surfaces a null importance_weight as-is without touching category or dates", async () => {
    const record: CogneeDataRecord = {
      id: "data-4",
      name: "text_x",
      raw_data_location: writeRecordFile("User lives in Madrid"),
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: null,
      last_accessed: null,
      importance_weight: null,
    };

    const fact = await toFact(record);

    expect(fact.importanceWeight).toBeNull();
  });
});
