import { beforeEach, describe, expect, it } from "bun:test";
import { addFact, getFact, setStorePath } from "./store.ts";

describe("addFact", () => {
  beforeEach(() => {
    setStorePath(":memory:");
  });

  it("classifies the category from text when it's omitted", () => {
    const now = Date.now();
    addFact({
      id: "fact-1",
      text: "I work at Google",
      storedAt: now,
      lastVerifiedAt: now,
    });

    expect(getFact("fact-1")?.category).toBe("employer");
  });

  it("keeps an explicitly provided category instead of classifying", () => {
    const now = Date.now();
    addFact({
      id: "fact-2",
      text: "I work at Google",
      category: "currentProject",
      storedAt: now,
      lastVerifiedAt: now,
    });

    expect(getFact("fact-2")?.category).toBe("currentProject");
  });
});
