# Progress

## Done

- v0.1: core check() engine, category half-lives, SQLite store
- v0.2: expiresAt field for exact-date facts
- v0.2: keyword-based auto-classification in classify()
- v0.2: CLI — optional category on `add`, wired to classify(), word-boundary matching fix
- v0.2: classify() embedding-based fallback for phrasing keywords miss (@xenova/transformers, all-MiniLM-L6-v2)
- adapter-mem0: done, read-only towards mem0 itself, smoke-tested against
  live mem0 data
- packages/mcp-server: done — check_freshness and mark_verified tools over
  @modelcontextprotocol/server (v2), stdio transport, bin entry runs standalone
- core's addFact is now an upsert (ON CONFLICT DO UPDATE keyed by id), so
  re-persisting the same id updates it instead of erroring
- adapter-mem0's scanMem0 persists every scanned memory locally via addFact,
  keyed by mem0's own id, closing the gap where mark_verified couldn't act
  on mem0-sourced facts
- packages/mcp-server: new scan_mem0_freshness tool — scans a mem0 user's
  memories end to end (scan, persist, check), returns results sorted
  needs-verification-first, using the same ids mark_verified can act on
- v0.5.3 npm publish (metadata fix, --help fix, prepublish safety check
  script), MCP add_fact + scan_facts tools (full local demo loop now
  available without Mem0)
- adapter-zep: built against @getzep/zep-cloud 3.28.0 (current stable, not
  the v4 alpha) via graph.edge.getByUserId() — a direct listing, not
  graph.search()'s relevance-ranked query. storedAt prefers validAt (when
  the fact became true) and falls back to createdAt; either invalidAt or
  expiredAt on an edge maps straight to expiresAt, so check() flags it
  needs-verification immediately instead of running the category half-life
  math. Mocked test suite passes; not yet smoke-tested against a live Zep
  account (scripts/seed-zep.ts and scripts/smoke-zep.ts are written and
  type-check, but haven't been run).
- packages/mcp-server: new scan_zep_freshness tool, mirroring
  scan_mem0_freshness
- v0.6.0: all five packages bumped together (minor, not patch — real new
  functionality, not a fix) and dry-run-published clean; adapter-zep now
  has its own description/keywords/README and is publish-ready for its
  first real release; root README covers Zep alongside Mem0 (badge,
  "Using it with Zep" section, MCP tool list, roadmap checkbox)

## Next

- Manual smoke test: run scripts/seed-zep.ts then scripts/smoke-zep.ts
  against a real Zep account (ZEP_API_KEY set) to confirm
  getByUserId()'s live response shape matches what mapper.ts assumes,
  then call mark_verified on one of the returned ids
- Once the live smoke test passes, run the real `bun publish` for all
  five packages at 0.6.0 (dry-run only so far)
- Cognee adapter (pick based on docs/free tier when you get there)
