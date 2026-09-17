import { describe, expect, it } from "bun:test";
import { classify } from "./classify";

// The embedding fallback loads a real model on first use (see below), which
// can take a while on a cold cache -- give those tests more headroom than
// bun's 5s default.
const EMBEDDING_TEST_TIMEOUT_MS = 120_000;

describe("classify", () => {
  it("recognizes employer facts", async () => {
    expect(await classify("I just started a new job")).toBe("employer");
    expect(await classify("I work at Google")).toBe("employer");
    expect(await classify("My employer offers good benefits")).toBe("employer");
    expect(await classify("The company is doing well this quarter")).toBe(
      "employer",
    );
  });

  it("recognizes location facts", async () => {
    expect(await classify("I live in Paris")).toBe("location");
    expect(await classify("We moved to Austin last year")).toBe("location");
    expect(await classify("My city is Berlin")).toBe("location");
    expect(await classify("Here's my new address")).toBe("location");
  });

  it("recognizes currentProject facts", async () => {
    expect(await classify("I'm working on a new app")).toBe("currentProject");
    expect(await classify("This project is due Friday")).toBe("currentProject");
    expect(await classify("We are building a rocket")).toBe("currentProject");
  });

  it("recognizes phoneNumber facts", async () => {
    expect(await classify("My phone is broken")).toBe("phoneNumber");
    expect(await classify("Here's my number")).toBe("phoneNumber");
    expect(await classify("Call me tonight")).toBe("phoneNumber");
  });

  it("classifies text touching more than one category by check order, via whole-word matches", async () => {
    // Contains "job" (employer) but no genuine phoneNumber phrase — "called"
    // is not "call me". Word-boundary matching keeps this from misfiring on
    // a substring, and employer wins because it's checked first.
    expect(await classify("I called my boss about the job")).toBe("employer");
  });

  // Real captured mem0 output: mem0 rewrites memories into third-person
  // canonical form, so these need the conjugated verb forms, not just the
  // first-person base form.
  it("recognizes mem0's third-person canonical phrasing", async () => {
    expect(await classify("User lives in Austin")).toBe("location");
    expect(await classify("User works at Acme Corp")).toBe("employer");
  });

  // All keyword-based tests above never touch the embedding model, so this
  // is the first place in the file that does -- keeping it first here (and
  // not relying on any other test/file to embed something first) is what
  // makes the timing numbers below a real cold-start measurement.
  describe("embedding fallback", () => {
    it(
      "classifies phrasing keyword matching would miss, via embedding similarity, and caches the model across calls",
      async () => {
        const t0 = performance.now();
        const first = await classify("User relocated to Denver");
        const t1 = performance.now();
        const second = await classify("User just started a new job");
        const t2 = performance.now();

        const firstMs = t1 - t0;
        const secondMs = t2 - t1;
        console.log(
          `embedding classify() -- first call (model load + embed): ${firstMs.toFixed(1)}ms, ` +
            `second call (model already cached): ${secondMs.toFixed(1)}ms`,
        );

        expect(first).toBe("location");
        expect(second).toBe("employer");
        // The first call pays for downloading/loading the model and
        // embedding every example sentence; the second only embeds its own
        // input text against the now-cached example embeddings.
        expect(secondMs).toBeLessThan(firstMs);
      },
      EMBEDDING_TEST_TIMEOUT_MS,
    );

    it(
      "still returns unknown for genuinely unrelated text",
      async () => {
        expect(await classify("The weather is nice today")).toBe("unknown");
      },
      EMBEDDING_TEST_TIMEOUT_MS,
    );
  });
});
