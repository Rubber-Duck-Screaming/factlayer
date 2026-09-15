import { beforeEach, describe, expect, it } from "bun:test";
import { check } from "./check";
import { addFact, getFact, markVerified, setStorePath } from "./store";
import type { Fact } from "./types.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

function makeFact(overrides: Partial<Fact> = {}): Fact {
  const now = Date.now();
  return {
    id: "fact-1",
    text: "Lives in Berlin",
    category: "location",
    storedAt: now,
    lastVerifiedAt: now,
    ...overrides,
  };
}

describe("check", () => {
  it("flags a location fact 200 days old as needs-verification", () => {
    const now = Date.now();
    const fact = makeFact({
      category: "location",
      lastVerifiedAt: now - 200 * DAY_MS,
    });

    const result = check(fact, now);

    expect(result.status).toBe("needs-verification");
    expect(result.thresholdInDays).toBe(180);
    expect(result.ageInDays).toBeCloseTo(200, 5);
  });

  it("treats a location fact 10 days old as fresh", () => {
    const now = Date.now();
    const fact = makeFact({
      category: "location",
      lastVerifiedAt: now - 10 * DAY_MS,
    });

    const result = check(fact, now);

    expect(result.status).toBe("fresh");
    expect(result.thresholdInDays).toBe(180);
  });

  it("never flags a staticFact regardless of age", () => {
    const now = Date.now();
    const fact = makeFact({
      category: "staticFact",
      lastVerifiedAt: now - 100_000 * DAY_MS,
    });

    const result = check(fact, now);

    expect(result.status).toBe("fresh");
    expect(result.thresholdInDays).toBe(Infinity);
  });

  it("falls back to a 90-day default threshold for unknown categories", () => {
    const now = Date.now();

    const stillFresh = check(
      makeFact({ category: "hobby", lastVerifiedAt: now - 80 * DAY_MS }),
      now,
    );
    expect(stillFresh.status).toBe("fresh");
    expect(stillFresh.thresholdInDays).toBe(90);

    const stale = check(
      makeFact({ category: "hobby", lastVerifiedAt: now - 100 * DAY_MS }),
      now,
    );
    expect(stale.status).toBe("needs-verification");
    expect(stale.thresholdInDays).toBe(90);
  });

  describe("markVerified", () => {
    beforeEach(() => {
      setStorePath(":memory:");
    });

    it("resets a fact's status back to fresh", () => {
      const now = Date.now();
      const fact = makeFact({
        id: "fact-2",
        category: "location",
        storedAt: now - 200 * DAY_MS,
        lastVerifiedAt: now - 200 * DAY_MS,
      });
      addFact(fact);

      expect(check(fact, now).status).toBe("needs-verification");

      markVerified(fact.id, now);
      const updated = getFact(fact.id);

      expect(updated).not.toBeNull();
      expect(check(updated as Fact, now).status).toBe("fresh");
    });
  });
});
