import { beforeEach, describe, expect, it } from "bun:test";
import { setStorePath } from "@factlayer/core";
import { runAdd, runScan } from "./commands.ts";

describe("cli", () => {
  beforeEach(() => {
    setStorePath(":memory:");
  });

  it("shows a freshly added fact as fresh in scan", () => {
    const id = runAdd("Lives in Berlin", "location");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);

    const output = runScan();

    expect(output).toContain("[fresh]");
    expect(output).toContain("location");
    expect(output).toContain("Lives in Berlin");
  });
});
