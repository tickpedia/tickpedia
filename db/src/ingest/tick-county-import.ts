// Ingest tick-presence-by-county surveillance (CDC ArboNET style).
//
// Two real-world layouts both flatten to the same row shape here:
//
//  A) "Single-tick" layout (e.g. 2024 A. americanum file)
//       columns: FIPS, State, County, Status, Source, Source Comments
//       The tick is implicit (one per file) — caller passes `tickSlug`.
//
//  B) "Multi-tick" layout (e.g. 2025 Ixodes file)
//       columns: FIPSCode, State, County,
//                Ixodes_scapularis_County_Status, Ixodes_scapularis_data_source,
//                Ixodes_pacificus_county_status,  Ixodes_pacificus_data_source
//       The two ticks are split into two long rows.
//
// Both feed the same `tick_county` natural key (tick_id, county_fips,
// year), so re-importing 10,000 times only touches the count of "rows
// updated" — not the row count itself.
//
// "No records" cells in the input are skipped by default — they don't
// carry information you couldn't infer from the absence of a row. Pass
// `keepNoRecords: true` to assert "we know there is nothing here" rows.

import { sql } from 'drizzle-orm'
import type { Db } from '../connect.js'
import { tickCounty, ticks, counties } from '../schema.js'
import { emptySummary, type IngestSummary } from './summary.js'

export type TickStatus = 'established' | 'reported' | 'no_records'

export interface TickCountyRow {
  tickSlug: string // e.g. 'ixodes-scapularis'
  countyFips: string // 5-char, leading zero preserved
  year: number
  status: TickStatus
  source: string | null
  sourceComments: string | null
}

export interface TickCountyImportInput {
  rows: TickCountyRow[]
  keepNoRecords?: boolean
}

export async function ingestTickCounty(
  db: Db,
  input: TickCountyImportInput,
): Promise<IngestSummary> {
  const summary = emptySummary()

  // Resolve tick slugs → ids (small table, fetch once).
  const allTicks = await db.select({ id: ticks.id, slug: ticks.slug }).from(ticks)
  const tickSlugToId = new Map(allTicks.map((t) => [t.slug, t.id]))

  const allCounties = await db.select({ fips: counties.fips }).from(counties)
  const knownFips = new Set(allCounties.map((c) => c.fips))

  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i]
    if (!r) continue

    if (r.status === 'no_records' && !input.keepNoRecords) {
      summary.skipped++
      continue
    }

    const tickId = tickSlugToId.get(r.tickSlug)
    if (!tickId) {
      summary.errors.push({
        row: i + 1,
        reason: `Unknown tick slug "${r.tickSlug}". Add it to seeds/ticks.ts and reseed.`,
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

    await db
      .insert(tickCounty)
      .values({
        tickId,
        countyFips: r.countyFips,
        year: r.year,
        status: r.status,
        source: r.source,
        sourceComments: r.sourceComments,
      })
      .onConflictDoUpdate({
        target: [tickCounty.tickId, tickCounty.countyFips, tickCounty.year],
        set: {
          status: sql`EXCLUDED.status`,
          source: sql`EXCLUDED.source`,
          sourceComments: sql`EXCLUDED.source_comments`,
          updatedAt: sql`now()`,
        },
      })
    summary.applied++
  }

  return summary
}

// ─── Pure parsers (no DB) ─────────────────────────────────────────────

const STATUS_MAP: Record<string, TickStatus> = {
  established: 'established',
  reported: 'reported',
  'no records': 'no_records',
  'no record': 'no_records',
  no_records: 'no_records',
  none: 'no_records',
}

export function parseStatus(raw: unknown): TickStatus | null {
  if (raw === null || raw === undefined) return null
  const key = String(raw).trim().toLowerCase()
  return STATUS_MAP[key] ?? null
}

function normalizeFips(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  const s = String(raw).trim()
  if (s.length === 0) return null
  // Numeric FIPS lose their leading zero in xlsx → pad.
  const padded = s.padStart(5, '0').slice(-5)
  return /^[0-9]{5}$/.test(padded) ? padded : null
}

// "Single-tick" layout (the lone-star file).
export interface SingleTickRawRow {
  FIPS: unknown
  State?: unknown
  County?: unknown
  Status: unknown
  Source?: unknown
  SourceComments?: unknown
}

export function parseSingleTickRows(
  raw: SingleTickRawRow[],
  ctx: { tickSlug: string; year: number },
): { rows: TickCountyRow[]; errors: { row: number; reason: string; raw: unknown }[] } {
  const rows: TickCountyRow[] = []
  const errors: { row: number; reason: string; raw: unknown }[] = []

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]
    if (!r) continue
    const fips = normalizeFips(r.FIPS)
    if (!fips) {
      errors.push({ row: i + 1, reason: `Missing/invalid FIPS`, raw: r })
      continue
    }
    const status = parseStatus(r.Status)
    if (!status) {
      errors.push({ row: i + 1, reason: `Unrecognized status "${r.Status}"`, raw: r })
      continue
    }
    rows.push({
      tickSlug: ctx.tickSlug,
      countyFips: fips,
      year: ctx.year,
      status,
      source: r.Source ? String(r.Source).trim() || null : null,
      sourceComments: r.SourceComments ? String(r.SourceComments).trim() || null : null,
    })
  }

  return { rows, errors }
}

// "Multi-tick" layout — caller declares which slug each pair of columns
// represents.
export interface MultiTickColumnPair {
  tickSlug: string
  statusColumn: string
  sourceColumn: string
}

export interface MultiTickRawRow {
  [column: string]: unknown
}

export function parseMultiTickRows(
  raw: MultiTickRawRow[],
  ctx: { fipsColumn: string; year: number; ticks: MultiTickColumnPair[] },
): { rows: TickCountyRow[]; errors: { row: number; reason: string; raw: unknown }[] } {
  const rows: TickCountyRow[] = []
  const errors: { row: number; reason: string; raw: unknown }[] = []

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]
    if (!r) continue
    const fips = normalizeFips(r[ctx.fipsColumn])
    if (!fips) {
      errors.push({ row: i + 1, reason: `Missing/invalid FIPS in ${ctx.fipsColumn}`, raw: r })
      continue
    }
    for (const pair of ctx.ticks) {
      const status = parseStatus(r[pair.statusColumn])
      if (!status) continue // permissive — blank cells are fine in multi-tick layouts
      rows.push({
        tickSlug: pair.tickSlug,
        countyFips: fips,
        year: ctx.year,
        status,
        source: r[pair.sourceColumn] ? String(r[pair.sourceColumn]).trim() || null : null,
        sourceComments: null,
      })
    }
  }

  return { rows, errors }
}
