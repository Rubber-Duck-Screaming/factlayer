import { describe, expect, it } from "bun:test";
import { toFact } from "./mapper";
import type { Mem0Memory } from "./types.ts";

describe("toFact", () => {
  it("maps a basic memory, classifying category from its text", async () => {
    const memory: Mem0Memory = {
      id: "mem-1",
      memory: "I work at Acme Corp",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };

    const fact = await toFact(memory);

    expect(fact.id).toBe("mem-1");
    expect(fact.text).toBe("I work at Acme Corp");
    expect(fact.category).toBe("employer");
    expect(fact.storedAt).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
    expect(fact.lastVerifiedAt).toBe(Date.parse("2026-01-02T00:00:00.000Z"));
    expect(fact.expiresAt).toBeNull();
  });

  it("parses createdAt/updatedAt given as ISO strings, not just Date objects", async () => {
    const memory: Mem0Memory = {
      id: "mem-2",
      memory: "I live in Lisbon",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-03T00:00:00.000Z",
    };

    const fact = await toFact(memory);

    expect(fact.storedAt).toBe(Date.parse("2026-02-01T00:00:00.000Z"));
    expect(fact.lastVerifiedAt).toBe(Date.parse("2026-02-03T00:00:00.000Z"));
    expect(fact.category).toBe("location");
  });

  it("falls back to now when timestamps are missing", async () => {
    // Uses keyword-matching text (not the point of this test) so classify()
    // stays on its fast path and this suite doesn't need network access.
    const now = Date.now();
    const fact = await toFact({ id: "mem-3", memory: "I work at a company" }, now);

    expect(fact.storedAt).toBe(now);
    expect(fact.lastVerifiedAt).toBe(now);
  });

  it("maps mem0's expirationDate to expiresAt", async () => {
    const fact = await toFact({
      id: "mem-4",
      memory: "I work at a company, passport expires soon",
      expirationDate: "2026-06-01T00:00:00.000Z",
    });

    expect(fact.expiresAt).toBe(Date.parse("2026-06-01T00:00:00.000Z"));
  });

  it("ignores mem0's own categories field in favor of classify()", async () => {
    const fact = await toFact({
      id: "mem-5",
      memory: "I work at Acme Corp",
      categories: ["random_mem0_tag", "unrelated"],
    });

    expect(fact.category).toBe("employer");
  });
});
