// Ingest CDC's per-county per-year Lyme disease case CSV.
//
// Source file shape (one row per county, ~3,150 rows):
//
//   Ctyname, stname, ststatus, stcode, ctycode,
//   Cases2001, Cases2002, …, Cases2020, cases2021, cases2022, cases2023
//
// The state FIPS lives in `stcode` (1–2 digit int) and the county FIPS
// suffix in `ctycode` (1–3 digit int) — we reconstruct the canonical
// 5-char county FIPS by padding and concatenating. Each year column
// becomes its own (county_fips, lyme-disease, year) row in
// `disease_county_year`. Re-importing is idempotent on the same natural
// key the CDC AllTBD ingest already uses, so this also overwrites any
// cumulative-window estimates from the AllTBD files for the years the
// per-year data covers — which is the right move (per-year > 4-year
// cumulative).
//
// Lyme is the only disease this importer handles; the source file is
// Lyme-specific (CDC publishes Lyme separately because it's the
// majority of all reported tick-borne disease cases).

import { sql } from 'drizzle-orm'
import type { Db } from '../connect.js'
import { diseaseCountyYear, diseases, counties } from '../schema.js'
import { emptySummary, type IngestSummary } from './summary.js'

export interface LymeRawRow {
  /** State FIPS as published — 1 or 2 digit integer or string. */
  stcode: unknown
  /** County FIPS suffix — 1, 2, or 3 digit integer or string. */
  ctycode: unknown
  /** Year-column cells: Cases2001…cases2023, value is integer count. */
  [yearColumn: string]: unknown
}

export interface LymeCountyImportInput {
  rows: LymeRawRow[]
}

const LYME_SLUG = 'lyme-disease'

// Match `cases2001` / `Cases2017` / `CASES2023` etc. — capture the year.
const YEAR_COLUMN = /^cases(\d{4})$/i

export function parseLymeRows(
  raw: LymeRawRow[],
): { entries: { fips: string; year: number; count: number }[]; errors: { row: number; reason: string; raw: unknown }[] } {
  const entries: { fips: string; year: number; count: number }[] = []
  const errors: { row: number; reason: string; raw: unknown }[] = []

  // Resolve year-bearing columns once from the first row's keys.
  const sample = raw[0] ?? {}
  const yearCols: { col: string; year: number }[] = []
  for (const k of Object.keys(sample)) {
    const m = YEAR_COLUMN.exec(k)
    if (m && m[1]) yearCols.push({ col: k, year: Number(m[1]) })
  }
  if (yearCols.length === 0) {
    errors.push({
      row: 0,
      reason: `No "Cases<YEAR>" columns found. Headers: ${Object.keys(sample).join(', ')}`,
      raw: sample,
    })
    return { entries, errors }
  }

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]
    if (!r) continue
    const stcode = String(r.stcode ?? '').trim()
    const ctycode = String(r.ctycode ?? '').trim()
    if (!stcode || !ctycode) {
      errors.push({ row: i + 1, reason: `Missing stcode/ctycode`, raw: r })
      continue
    }
    const fips = stcode.padStart(2, '0').slice(-2) + ctycode.padStart(3, '0').slice(-3)
    if (!/^[0-9]{5}$/.test(fips)) {
      errors.push({ row: i + 1, reason: `Malformed FIPS "${fips}" from stcode=${stcode} ctycode=${ctycode}`, raw: r })
      continue
    }

    for (const { col, year } of yearCols) {
      const v = r[col]
      if (v === null || v === undefined || v === '') continue
      const s = String(v).trim()
      // CDC sometimes uses "<5" / "*" / blank for suppressed cells —
      // skip the same way cdc-county.parseCount does.
      if (s.startsWith('<') || s === '*') continue
      const n = Number(s.replace(/,/g, ''))
      if (!Number.isFinite(n)) continue
      entries.push({ fips, year, count: n })
    }
  }

  return { entries, errors }
}

export async function ingestLymeCountyYear(
  db: Db,
  input: LymeCountyImportInput,
): Promise<IngestSummary> {
  const summary = emptySummary()
  const { entries, errors: parseErrors } = parseLymeRows(input.rows)
  summary.errors.push(...parseErrors)

  const lymeRow = await db
    .select({ id: diseases.id })
    .from(diseases)
    .where(sql`${diseases.slug} = ${LYME_SLUG}`)
    .limit(1)
  const lymeId = lymeRow[0]?.id
  if (!lymeId) {
    summary.errors.push({
      row: 0,
      reason: `disease "lyme-disease" not in seeds — reseed the diseases table before importing.`,
    })
    return summary
  }

  const allCounties = await db.select({ fips: counties.fips }).from(counties)
  const knownFips = new Set(allCounties.map((c) => c.fips))

  type Pending = { countyFips: string; diseaseId: number; year: number; count: number }
  const pending: Pending[] = []
  for (const e of entries) {
    if (!knownFips.has(e.fips)) {
      // Unknown county FIPS — likely a CDC summary row (US total, state
      // aggregate). Skip silently; if a real new county shows up the
      // admin can add it via seeds/locations/extra-counties.ts.
      summary.skipped++
      continue
    }
    pending.push({ countyFips: e.fips, diseaseId: lymeId, year: e.year, count: e.count })
  }

  const CHUNK = 500
  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK)
    await db
      .insert(diseaseCountyYear)
      .values(chunk)
      .onConflictDoUpdate({
        target: [diseaseCountyYear.countyFips, diseaseCountyYear.diseaseId, diseaseCountyYear.year],
        set: {
          count: sql`EXCLUDED.count`,
          updatedAt: sql`now()`,
        },
      })
    summary.applied += chunk.length
  }
  return summary
}
