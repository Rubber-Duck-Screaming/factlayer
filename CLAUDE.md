# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project

factlayer — a freshness-check layer for AI agent memory. Detects when a
stored fact (job, location, current project, etc.) is old enough that it
should be re-verified before an agent states it as current.

(See `PROGRESS.md` for current status and what's next.)

# Tech stack

- Bun (not Node directly) for dev, testing, and running scripts
- TypeScript throughout
- SQLite for storage (bun:sqlite)
- Monorepo via Bun workspaces under `packages/*`

# Code style

- ES modules only, no CommonJS
- Strict TypeScript, no `any` without a comment explaining why
- New packages extend the root `tsconfig.base.json` rather than repeating
  compiler options

# Commands

- `bun install` — install all workspace dependencies
- `bun test` — run every test in the workspace
- `bun test packages/core/src/index.test.ts` — run a single test file
- `bun test -t "test name"` — run tests matching a name pattern
- `cd packages/core && bun run build` — type-check/build one package with `tsc`

# Workflow

- Write a test for every new function in core before moving to the next one
- Run `bun test` after any change to packages/core
- Don't touch adapter packages until core/ has passing tests
- Update PROGRESS.md at the end of every task, before reporting it done.
