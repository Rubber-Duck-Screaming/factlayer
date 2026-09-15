import { describe, expect, it } from "bun:test";
import { classify } from "./classify.ts";

describe("classify", () => {
  it("recognizes employer facts", () => {
    expect(classify("I just started a new job")).toBe("employer");
    expect(classify("I work at Google")).toBe("employer");
    expect(classify("My employer offers good benefits")).toBe("employer");
    expect(classify("The company is doing well this quarter")).toBe(
      "employer",
    );
  });

  it("recognizes location facts", () => {
    expect(classify("I live in Paris")).toBe("location");
    expect(classify("We moved to Austin last year")).toBe("location");
    expect(classify("My city is Berlin")).toBe("location");
    expect(classify("Here's my new address")).toBe("location");
  });

  it("recognizes currentProject facts", () => {
    expect(classify("I'm working on a new app")).toBe("currentProject");
    expect(classify("This project is due Friday")).toBe("currentProject");
    expect(classify("We are building a rocket")).toBe("currentProject");
  });

  it("recognizes phoneNumber facts", () => {
    expect(classify("My phone is broken")).toBe("phoneNumber");
    expect(classify("Here's my number")).toBe("phoneNumber");
    expect(classify("Call me tonight")).toBe("phoneNumber");
  });

  it("falls back to unknown for text matching no keywords", () => {
    expect(classify("The weather is nice today")).toBe("unknown");
  });

  it("classifies text touching more than one category by check order, via whole-word matches", () => {
    // Contains "job" (employer) but no genuine phoneNumber phrase — "called"
    // is not "call me". Word-boundary matching keeps this from misfiring on
    // a substring, and employer wins because it's checked first.
    expect(classify("I called my boss about the job")).toBe("employer");
  });
});
