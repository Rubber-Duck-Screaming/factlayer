import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setStorePath } from "@factlayer/core";

// cli.ts is a top-level-executing script (it reads process.argv and calls
// process.exit), so it can't be imported directly in-process — it has to be
// run as a real subprocess to exercise its argv handling.
const CLI_PATH = join(import.meta.dir, "cli.ts");
const USAGE = "Usage: factcheck <add|scan|verify> [args]";

describe("factcheck --help / -h / no args / unknown command", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "factcheck-cli-help-"));
  });

  afterAll(() => {
    // Release our handle on the sqlite file in this temp dir before
    // deleting it — Windows won't remove a file that's still open.
    setStorePath(":memory:");
    rmSync(dir, { recursive: true, force: true });
  });

  it("--help prints usage to stdout and exits 0", () => {
    const result = Bun.spawnSync({
      cmd: [process.execPath, CLI_PATH, "--help"],
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain(USAGE);
  });

  it("-h prints usage to stdout and exits 0", () => {
    const result = Bun.spawnSync({
      cmd: [process.execPath, CLI_PATH, "-h"],
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain(USAGE);
  });

  it("no arguments prints usage to stdout and exits 0", () => {
    const result = Bun.spawnSync({
      cmd: [process.execPath, CLI_PATH],
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain(USAGE);
  });

  it("a genuinely unknown command still prints usage but exits non-zero", () => {
    const result = Bun.spawnSync({
      cmd: [process.execPath, CLI_PATH, "foo"],
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("Unknown command: foo");
    expect(result.stderr.toString()).toContain(USAGE);
  });
});
