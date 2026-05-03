// Ingest CDC monthly disease counts (national).
//
// Expected long-format input — one row per (year, month, disease, count).
// Wide → long flattening for monthly XLSX files happens in the admin UI
// before calling this; this module just upserts.

import { sql } from 'drizzle-orm'
import type { Db } from '../connect.js'
import { diseaseMonth, diseases } from '../schema.js'
import { slugify } from '../normalize.js'
import { emptySummary, type IngestSummary } from './summary.js'

export interface DiseaseMonthRow {
  year: number
  month: number // 1–12
  diseaseName: string // raw display string; we slugify + resolve
  count: number
}

// CDC's national monthly drop ships month as the English name
// (`January`..`December` / `Jan`..`Dec`) instead of an integer; the
// county-year drop uses 1..12. Accept both so the admin page doesn't
// need to fork on file shape.
const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

export function parseMonth(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 12) return raw
  const s = String(raw).trim().toLowerCase()
  if (!s) return null
  const named = MONTH_NAMES[s]
  if (named !== undefined) return named
  const n = Number(s)
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null
}

export async function ingestDiseaseMonth(
  db: Db,
  rows: DiseaseMonthRow[],
): Promise<IngestSummary> {
  const summary = emptySummary()

  const allDiseases = await db
    .select({ id: diseases.id, slug: diseases.slug, aliases: diseases.aliases })
    .from(diseases)
  const slugToId = new Map<string, number>()
  for (const d of allDiseases) {
    slugToId.set(d.slug, d.id)
    for (const alias of d.aliases) slugToId.set(alias, d.id)
  }

  type Pending = { year: number; month: number; diseaseId: number; count: number }
  const pending: Pending[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r) continue

    if (!Number.isInteger(r.year) || r.year < 1900 || r.year > 2200) {
      summary.errors.push({ row: i + 1, reason: `Invalid year ${r.year}`, raw: r })
      continue
    }
    if (!Number.isInteger(r.month) || r.month < 1 || r.month > 12) {
      summary.errors.push({ row: i + 1, reason: `Invalid month ${r.month}`, raw: r })
      continue
    }

    const diseaseId = slugToId.get(slugify(r.diseaseName))
    if (!diseaseId) {
      summary.errors.push({
        row: i + 1,
        reason: `Unknown disease "${r.diseaseName}". Add to seeds/diseases.ts and reseed.`,
        raw: r,
      })
      continue
    }

    pending.push({ year: r.year, month: r.month, diseaseId, count: r.count })
  }

  const CHUNK = 500
  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK)
    await db
      .insert(diseaseMonth)
      .values(chunk)
      .onConflictDoUpdate({
        target: [diseaseMonth.year, diseaseMonth.month, diseaseMonth.diseaseId],
        set: {
          count: sql`EXCLUDED.count`,
          updatedAt: sql`now()`,
        },
      })
    summary.applied += chunk.length
  }

  return summary
}
