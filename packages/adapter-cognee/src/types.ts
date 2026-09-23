// The minimal slice of @cognee/cognee-ts's client shape that this adapter
// depends on. Matches the real Cognee class's datasets.listData() (see
// client.ts for the real wrapper); tests inject a fake object with this
// same shape instead of making real (LLM/embedding-backed) calls.
//
// Verified against node_modules/@cognee/cognee-ts@0.2.0's own lib/types.d.ts:
// CogneeDataRecord mirrors cognee_models::Data -- a metadata row about a
// piece of *ingested source material* (referenced by raw_data_location, a
// storage path), not one of the extracted knowledge-graph facts
// search()/recall() return.
//
// `name` looked like a plausible text field at first, but live output
// against a real Cognee instance confirmed it's actually an internal
// hash-based filename (e.g. "text_b746e53fca48a4c932a25ac28fbdb0c2"), not
// fact content -- see mapper.ts's design note. The real content lives at
// `raw_data_location`, a `file://` URI pointing at a local file on disk,
// which mapper.ts reads directly.
//
// Timestamps are real: created_at (ingest time, always present) and
// updated_at (nullable). last_accessed is kept here even though mapper.ts
// deliberately never reads it, so that omission stays visible rather than
// silent. importance_weight is an undocumented, nullable score from
// Cognee's own pruning/decay bookkeeping -- surfaced by the mapper but not
// used in factlayer's freshness math.
export interface CogneeDataRecord {
  id: string;
  name: string;
  raw_data_location: string;
  created_at: string;
  updated_at: string | null;
  last_accessed: string | null;
  importance_weight: number | null;
}

export interface CogneeClient {
  listData(datasetId: string): Promise<CogneeDataRecord[]>;
}
