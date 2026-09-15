import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getFact, setStorePath } from "@factlayer/core";

// cli.ts is a top-level-executing script (it reads process.argv and calls
// process.exit), so it can't be imported directly in-process — it has to be
// run as a real subprocess to exercise its argv handling.
const CLI_PATH = join(import.meta.dir, "cli.ts");

describe("factcheck add (no category)", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "factcheck-cli-"));
  });

  afterAll(() => {
    // Release our handle on the sqlite file in this temp dir before
    // deleting it — Windows won't remove a file that's still open.
    setStorePath(":memory:");
    rmSync(dir, { recursive: true, force: true });
  });

  it("classifies the fact via classify() instead of leaving it unknown", () => {
    const result = Bun.spawnSync({
      cmd: [process.execPath, CLI_PATH, "add", "I started working at Acme Corp"],
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);

    const id = result.stdout.toString().trim();
    expect(id.length).toBeGreaterThan(0);

    setStorePath(join(dir, "factcheck.db"));
    const fact = getFact(id);

    expect(fact).not.toBeNull();
    expect(fact?.category).toBe("employer");
    expect(fact?.category).not.toBe("unknown");
  });
});
