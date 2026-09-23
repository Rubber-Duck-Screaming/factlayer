// Design note: Cognee's search()/recall() -- its extracted knowledge-graph
// facts -- carry no timestamp fields in @cognee/cognee-ts's current types
// (CogneeSearchItem is just `{ id, score, payload }`; CogneeRecallItem is
// just `{ source, content, score }`), making them unusable as a freshness
// source. This adapter instead uses datasets.listData(datasetId), which
// returns pre-extraction raw ingested records (CogneeDataRecord) that do
// carry real timestamps. This means the Cognee adapter tracks freshness of
// ingested source material, not extracted graph facts -- a real scope
// difference from adapter-mem0 and adapter-zep, documented here rather
// than hidden.
//
// A second consequence of that same choice: CogneeDataRecord has no inline
// text-content field. `name` looked like a plausible stand-in at first, but
// live output against a real Cognee instance confirmed it's actually an
// internal hash-based filename (e.g.
// "text_b746e53fca48a4c932a25ac28fbdb0c2"), not the fact's content -- using
// it as `text` would have made the adapter report gibberish instead of
// facts. The real content lives at `raw_data_location`, a `file://` URI
// pointing at a local file on disk, so toFact() reads that file directly.
//
// Assumption, not a guarantee: this only works when the FactLayer process
// can read Cognee's local storage on the same filesystem -- true for our
// current self-hosted setup (both run on one machine), but it would break
// if Cognee and FactLayer ever ran on separate machines without a shared
// mount. Documented here rather than silently assumed.

import { readFile } from "node:fs/promises";
import { classify } from "@factlayer/core";
import type { Fact } from "@factlayer/core";
import type { CogneeDataRecord } from "./types.ts";

const FILE_URI_PREFIX = "file://";

// Cognee's raw_data_location is a `file://` URI, but on Windows the path
// after the scheme keeps its native backslashes instead of being
// forward-slash-encoded like a spec-compliant file URI would be (a real
// one is "file:///C:/Users/...", three slashes, forward-slash-separated;
// Cognee's own output is "file://C:\\Users\\...\\text_....txt", two
// slashes, backslash-separated). Parsing that with `new URL()` /
// `fileURLToPath()` would treat "C:" as the URL's host and silently drop
// it from the resulting path, corrupting the drive letter. So this strips
// the "file://" prefix as a plain string instead of URL-parsing it, and
// hands the remainder to fs as-is -- Node's fs accepts either slash
// direction on Windows.
function fileUriToPath(uri: string): string {
  return uri.startsWith(FILE_URI_PREFIX) ? uri.slice(FILE_URI_PREFIX.length) : uri;
}

// Same as Fact, plus Cognee's own optional pruning/decay score. Kept as a
// separate type (rather than added to core's Fact) because it's specific
// to this one source -- see the module comment above for why it's
// deliberately excluded from check()'s math.
export interface CogneeFact extends Fact {
  importanceWeight?: number | null;
}

function toMs(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? fallback : ms;
}

// Converts a Cognee data record (a pre-extraction ingested item, not an
// extracted graph fact -- see the module comment above) into a factlayer
// Fact.
//
// - storedAt comes from created_at (when the item was ingested).
// - lastVerifiedAt comes from updated_at, falling back to created_at when
//   updated_at is null. Deliberately NOT last_accessed: that field is an
//   access-frequency signal (how often Cognee's own code read the record),
//   not a truth-verification signal -- treating "read recently" as "still
//   true" is exactly the mistake factlayer exists to catch.
// - text is read from the file at raw_data_location (see the module
//   comment above for why, and the same-filesystem assumption this
//   depends on) -- NOT record.name, which is an internal hash-based
//   filename, not fact content.
// - category always comes from classify() on that file content -- Cognee
//   doesn't expose a comparable freeform category on data records.
// - expiresAt is always null: CogneeDataRecord has no expiration-style
//   field, so check() always falls through to the category half-life math.
// - importanceWeight passes through record.importance_weight as-is
//   (undocumented and nullable in Cognee's own types) for callers who want
//   it, without factoring into check() at all.
export async function toFact(record: CogneeDataRecord, now: number = Date.now()): Promise<CogneeFact> {
  const text = (await readFile(fileUriToPath(record.raw_data_location), "utf-8")).trim();
  const storedAt = toMs(record.created_at, now);
  const lastVerifiedAt = toMs(record.updated_at, storedAt);

  return {
    id: record.id,
    text,
    category: await classify(text),
    storedAt,
    lastVerifiedAt,
    expiresAt: null,
    importanceWeight: record.importance_weight,
  };
}
