// Ingest tick-pathogen-presence-by-county surveillance.
//
// CDC's "Public Use Ixodes Pathogens County Table" is a multi-pathogen
// xlsx — one row per county, paired status + source columns per
// pathogen:
//
//   FIPS_Code, State, County,
//   Borrelia_burgdorferi_sensu_stricto_County_Status,
//   Borrelia_burgdorferi_sensu_stricto_Data_Source,
//   Borrelia_mayonii_County_Status, Borrelia_mayonii_Data_Source,
//   …(repeat per pathogen)…
//
// Same column-pair detection as `parseMultiTickRows` — strip
// `_county_status` / `_status` from each status header, find the
// matching `<prefix>_data_source`, and resolve the prefix to a
// pathogen via `pathogens.scientific_name` (case + underscore-insensitive)
// or its aliases (slugified).
//
// Status vocabulary is much smaller than tick presence — CDC only
// publishes "Present" or "No records" for pathogens (vs. the tick
// table's three-state established/reported/no_records). Idempotent
// natural key `(pathogen_id, county_fips, year)`.

import { sql } from 'drizzle-orm'
import type { Db } from '../connect.js'
import { pathogenCounty, pathogens, counties } from '../schema.js'
import { emptySummary, type IngestSummary } from './summary.js'

export type PathogenStatus = 'present' | 'no_records'

export interface PathogenCountyRow {
  pathogenSlug: string
  countyFips: string
  year: number
  status: PathogenStatus
  source: string | null
}

export interface PathogenCountyImportInput {
  rows: PathogenCountyRow[]
  /** Persist `no_records` rows. Default false (storage-saving — every
   *  county that hasn't been tested is implicitly no_records anyway). */
  keepNoRecords?: boolean
}

export interface PathogenColumnPair {
  pathogenSlug: string
  statusColumn: string
  sourceColumn: string
}

export interface PathogenRawRow {
  [column: string]: unknown
}

const STATUS_MAP: Record<string, PathogenStatus> = {
  present: 'present',
  'no records': 'no_records',
  'no record': 'no_records',
  no_records: 'no_records',
  none: 'no_records',
}

export function parsePathogenStatus(raw: unknown): PathogenStatus | null {
  if (raw === null || raw === undefined) return null
  const key = String(raw).trim().toLowerCase()
  return STATUS_MAP[key] ?? null
}

function normalizeFips(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  const s = String(raw).trim()
  if (s.length === 0) return null
  const padded = s.padStart(5, '0').slice(-5)
  return /^[0-9]{5}$/.test(padded) ? padded : null
}

export function parsePathogenRows(
  raw: PathogenRawRow[],
  ctx: { fipsColumn: string; year: number; pathogens: PathogenColumnPair[] },
): { rows: PathogenCountyRow[]; errors: { row: number; reason: string; raw: unknown }[] } {
  const rows: PathogenCountyRow[] = []
  const errors: { row: number; reason: string; raw: unknown }[] = []

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]
    if (!r) continue
    const fips = normalizeFips(r[ctx.fipsColumn])
    if (!fips) {
      errors.push({ row: i + 1, reason: `Missing/invalid FIPS in ${ctx.fipsColumn}`, raw: r })
      continue
    }
    for (const pair of ctx.pathogens) {
      const status = parsePathogenStatus(r[pair.statusColumn])
      if (!status) continue
      rows.push({
        pathogenSlug: pair.pathogenSlug,
        countyFips: fips,
        year: ctx.year,
        status,
        source: r[pair.sourceColumn] ? String(r[pair.sourceColumn]).trim() || null : null,
      })
    }
  }
  return { rows, errors }
}

export async function ingestPathogenCounty(
  db: Db,
  input: PathogenCountyImportInput,
): Promise<IngestSummary> {
  const summary = emptySummary()

  const allPathogens = await db
    .select({ id: pathogens.id, slug: pathogens.slug, aliases: pathogens.aliases })
    .from(pathogens)
  const pathogenSlugToId = new Map<string, number>()
  for (const p of allPathogens) {
    pathogenSlugToId.set(p.slug, p.id)
    for (const alias of p.aliases) pathogenSlugToId.set(alias, p.id)
  }

  const allCounties = await db.select({ fips: counties.fips }).from(counties)
  const knownFips = new Set(allCounties.map((c) => c.fips))

  type Pending = {
    pathogenId: number
    countyFips: string
    year: number
    status: PathogenStatus
    source: string | null
  }
  const pending: Pending[] = []

  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i]
    if (!r) continue
    if (r.status === 'no_records' && !input.keepNoRecords) {
      summary.skipped++
      continue
    }
    const pathogenId = pathogenSlugToId.get(r.pathogenSlug)
    if (!pathogenId) {
      summary.errors.push({
        row: i + 1,
        reason: `Unknown pathogen slug "${r.pathogenSlug}". Add it to seeds/pathogens.ts and reseed.`,
        raw: r,
      })
      continue
    }
    if (!knownFips.has(r.countyFips)) {
      summary.errors.push({
        row: i + 1,
        reason: `Unknown county FIPS ${r.countyFips}`,
        raw: r,
      })
      continue
    }
    pending.push({
      pathogenId,
      countyFips: r.countyFips,
      year: r.year,
      status: r.status,
      source: r.source,
    })
  }

  const CHUNK = 500
  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK)
    await db
      .insert(pathogenCounty)
      .values(chunk)
      .onConflictDoUpdate({
        target: [pathogenCounty.pathogenId, pathogenCounty.countyFips, pathogenCounty.year],
        set: {
          status: sql`EXCLUDED.status`,
          source: sql`EXCLUDED.source`,
          updatedAt: sql`now()`,
        },
      })
    summary.applied += chunk.length
  }

  return summary
}
