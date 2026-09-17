import { beforeEach, describe, expect, it } from "bun:test";
import { addFact, getFact, setStorePath } from "./store";

describe("addFact", () => {
  beforeEach(() => {
    setStorePath(":memory:");
  });

  it("classifies the category from text when it's omitted", async () => {
    const now = Date.now();
    await addFact({
      id: "fact-1",
      text: "I work at Google",
      storedAt: now,
      lastVerifiedAt: now,
    });

    expect(getFact("fact-1")?.category).toBe("employer");
  });

  it("keeps an explicitly provided category instead of classifying", async () => {
    const now = Date.now();
    await addFact({
      id: "fact-2",
      text: "I work at Google",
      category: "currentProject",
      storedAt: now,
      lastVerifiedAt: now,
    });

    expect(getFact("fact-2")?.category).toBe("currentProject");
  });
});
