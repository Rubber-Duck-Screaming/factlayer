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
- adapter-cognee: built against @cognee/cognee-ts 0.2.0 (installs cleanly
  on Windows/Bun via the prebuilt @cognee/neon-win32-x64-msvc native
  binary; no Rust toolchain needed). Recon (throwaway bun-add + .d.ts
  inspection, not committed) found that search()/recall() -- Cognee's
  extracted knowledge-graph facts -- carry no timestamp fields at all in
  the current types, so they're unusable as a freshness source. The
  adapter uses datasets.listData(datasetId) instead: pre-extraction raw
  ingested records (CogneeDataRecord) that do carry real created_at/
  updated_at. This means the Cognee adapter tracks freshness of _ingested
  source material_, not extracted graph facts -- a real scope difference
  from adapter-mem0 and adapter-zep, documented in mapper.ts rather than
  hidden. Same recon also found CogneeDataRecord has no inline text-content
  field (content lives at raw_data_location, a storage path); `name` (the
  ingest-time display name) is the closest available field and is what
  `text` maps from. lastVerifiedAt is updated_at falling back to
  created_at -- deliberately never last_accessed, which is an
  access-frequency signal, not a verification one. importance_weight
  (Cognee's own undocumented, nullable pruning/decay score) is surfaced on
  the mapped fact but intentionally excluded from check()'s math. Cognee's
  client factory is async (unlike mem0/Zep's sync ones) because its SDK
  requires an await warm() after construction; init() (the Rust async
  runtime bootstrap) is guarded to run at most once per process. Mocked
  test suite passes; not yet smoke-tested against a live Cognee instance.
- packages/mcp-server: new scan_cognee_freshness tool, mirroring
  scan_mem0_freshness/scan_zep_freshness (datasetId input instead of
  userId, since Cognee's freshness source is a dataset, not a user)
- Live smoke test for adapter-cognee (scripts/seed-cognee.ts) against a
  self-hosted OpenAI-compatible endpoint (AICredits, model
  "openai/gpt-4o-mini"): three remember() calls into the "smoketest"
  dataset. The first ran the full cognify pipeline for real (~11s --
  chunking, graph extraction, summarization, entities/edges stored and
  indexed), but the 2nd and 3rd short-circuited immediately with "dataset
  already completed" -- Cognee tracks cognify's pipeline-run completion
  per *dataset*, not per item, so only the first remember() call into an
  already-completed dataset actually re-extracts; later calls still
  report `status: "PipelineRunCompleted"` even though no extraction ran
  for their specific content. (`c.users.resetDatasetPipelineRunStatus
  (datasetId)` exists in the SDK to unblock this, per its own doc
  comment.) Doesn't affect scanCognee() itself, which reads raw ingested
  records via datasets.listData() rather than the graph -- all three
  items are still ingested and should show up there regardless of
  whether cognify ran on them.
- Bug found from that same live output, now fixed: CogneeDataRecord.name
  is an internal hash-based filename (e.g.
  "text_b746e53fca48a4c932a25ac28fbdb0c2"), not fact content -- mapper.ts
  was silently mapping that hash into `text` instead of real content.
  Fixed: `text` now comes from reading the actual file at
  raw_data_location (a `file://` URI) via node:fs/promises. Windows
  quirk documented and handled: Cognee's raw_data_location isn't a
  spec-compliant file:// URI on Windows (only two slashes, then a
  backslash-separated native path, e.g.
  "file://C:\\Users\\...\\text_x.txt"), so parsing it with
  `new URL()`/`fileURLToPath()` would misread the drive letter as the
  URL's host and silently drop it -- the fix strips the "file://" prefix
  as a plain string instead of URL-parsing it. Documented as an explicit
  assumption, not a guarantee: this only works when FactLayer can read
  Cognee's storage on the same filesystem -- breaks if they ever run on
  separate machines without a shared mount. mapper.test.ts and
  scan.test.ts rewritten to write real temp files (mkdtempSync, same
  convention as packages/cli's tests) and assert on their actual
  content, instead of asserting on `name`; mcp-server's
  scan_cognee_freshness tests updated the same way. Full suite: 79
  tests passing.
- adapter-cognee: built, live-smoke-tested end to end against real
  extraction (confirmed working OPENAI_URL: https://api.aicredits.in/v1),
  mapper reads real file content from raw_data_location, not the
  hash-based name field
- Known Cognee-specific behavior worth remembering: cognify()
  short-circuits per dataset once marked complete, not per item — only
  the first fact seeded into a given dataset actually gets
  graph-extracted unless resetDatasetPipelineRunStatus() is called
- adapter-cognee now has its own description/keywords/README
  (packages/adapter-cognee/README.md), publish-ready like the other five
  packages; root README covers Cognee alongside Mem0 and Zep (badge,
  "Using it with Cognee" section, MCP tool list, roadmap checkbox)

- v0.7.0: all six packages (core, cli, adapter-mem0, mcp-server,
  adapter-zep, adapter-cognee) bumped together (minor, not patch — the
  Cognee adapter is genuine new functionality, not a fix); adapter-mem0
  and adapter-zep descriptions reworded to the flags-what/why phrasing
  used elsewhere; adapter-mem0's README now notes it runs classify() on
  memory text since Mem0 doesn't supply a category itself, matching the
  detail level of adapter-zep's invalidAt/expiredAt note.
  check-publish-ready.ts and `bun publish --dry-run` pass clean for all
  six, including adapter-cognee's first-ever publish attempt (file list
  checked by hand: same dist-only shape as the other adapters, nothing
  unexpected packed in)

## Next

- Real `bun publish` for all six packages together at v0.7.0 (dry-run
  only so far, including adapter-cognee's first release)
