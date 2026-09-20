#!/usr/bin/env bun
// Pre-publish gate: every package under packages/* must have a
// "description", "keywords", and a README.md in its own folder before any
// package in the workspace can be published. Wired as each package's
// prepublishOnly script, so `bun publish` physically refuses to run if any
// package falls out of sync -- this stops being a "remember to do it"
// checklist item and becomes a build failure instead.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES_DIR = join(REPO_ROOT, "packages");

interface PackageJson {
  name?: string;
  description?: string;
  keywords?: string[];
}

const problems: string[] = [];

for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const packageDir = join(PACKAGES_DIR, entry.name);
  const packageJsonPath = join(packageDir, "package.json");
  if (!existsSync(packageJsonPath)) continue;

  const pkg: PackageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  const label = pkg.name ?? entry.name;

  if (!pkg.description?.trim()) {
    problems.push(`${label}: missing "description" in package.json`);
  }
  if (!pkg.keywords || pkg.keywords.length === 0) {
    problems.push(`${label}: missing "keywords" in package.json`);
  }
  if (!existsSync(join(packageDir, "README.md"))) {
    problems.push(`${label}: missing README.md in packages/${entry.name}`);
  }
}

if (problems.length > 0) {
  console.error("check-publish-ready failed:\n");
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error("\nFix these before publishing.");
  process.exit(1);
}

console.log("check-publish-ready: every package has a description, keywords, and README.md.");
