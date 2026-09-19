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

## Next

- Manual smoke test
