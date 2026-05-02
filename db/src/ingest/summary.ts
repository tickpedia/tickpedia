// Shared summary shape every ingest function returns. The admin import
// page renders this verbatim. Errors carry the original raw row so an
// admin can copy/paste it back into the spreadsheet to fix.
//
// The contract is "this many rows arrived in the database; if you re-
// import, you'll get the same row count and zero duplicates because of
// the natural-key unique indexes". We don't try to split inserted vs
// updated — Postgres `ON CONFLICT DO UPDATE` doesn't expose that
// cleanly across drivers, and the answer doesn't change what an admin
// would do next.

export interface IngestError {
  row: number
  reason: string
  raw?: unknown
}

export interface IngestSummary {
  /** Rows successfully written (inserted or updated). */
  applied: number
  /** Rows intentionally skipped (e.g. "no records" cells). */
  skipped: number
  errors: IngestError[]
}

export function emptySummary(): IngestSummary {
  return { applied: 0, skipped: 0, errors: [] }
}
