import { describe, expect, it } from "bun:test";
import { toFact } from "./mapper";
import type { ZepEntityEdge } from "./types.ts";

describe("toFact", () => {
  it("maps a normal fact, classifying category from its text", async () => {
    const edge: ZepEntityEdge = {
      uuid: "edge-1",
      fact: "User works at Acme Corp",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const fact = await toFact(edge);

    expect(fact.id).toBe("edge-1");
    expect(fact.text).toBe("User works at Acme Corp");
    expect(fact.category).toBe("employer");
    expect(fact.storedAt).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
    expect(fact.lastVerifiedAt).toBe(fact.storedAt);
    expect(fact.expiresAt).toBeNull();
  });

  it("prefers validAt over createdAt for storedAt when both are present", async () => {
    const edge: ZepEntityEdge = {
      uuid: "edge-valid",
      fact: "User lives in Lisbon",
      createdAt: "2026-01-01T00:00:00.000Z",
      validAt: "2025-12-15T00:00:00.000Z",
    };

    const fact = await toFact(edge);

    expect(fact.storedAt).toBe(Date.parse("2025-12-15T00:00:00.000Z"));
    expect(fact.lastVerifiedAt).toBe(fact.storedAt);
  });

  it("falls back to now when createdAt is missing", async () => {
    const now = Date.now();
    const fact = await toFact({ uuid: "edge-2", fact: "User works at a company" }, now);

    expect(fact.storedAt).toBe(now);
    expect(fact.lastVerifiedAt).toBe(now);
  });

  it("maps a Zep-invalidated fact's invalidAt straight to expiresAt", async () => {
    const fact = await toFact({
      uuid: "edge-3",
      fact: "User lives in Lisbon",
      createdAt: "2026-01-01T00:00:00.000Z",
      invalidAt: "2026-01-15T00:00:00.000Z",
    });

    expect(fact.expiresAt).toBe(Date.parse("2026-01-15T00:00:00.000Z"));
  });

  it("maps a Zep-invalidated fact's expiredAt straight to expiresAt", async () => {
    const fact = await toFact({
      uuid: "edge-4",
      fact: "User lives in Porto",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiredAt: "2026-01-20T00:00:00.000Z",
    });

    expect(fact.expiresAt).toBe(Date.parse("2026-01-20T00:00:00.000Z"));
  });

  it("uses the earlier of invalidAt and expiredAt when both are present", async () => {
    const fact = await toFact({
      uuid: "edge-5",
      fact: "User lives in Madrid",
      createdAt: "2026-01-01T00:00:00.000Z",
      invalidAt: "2026-01-20T00:00:00.000Z",
      expiredAt: "2026-01-10T00:00:00.000Z",
    });

    expect(fact.expiresAt).toBe(Date.parse("2026-01-10T00:00:00.000Z"));
  });
});
