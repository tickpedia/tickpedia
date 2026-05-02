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

    await db
      .insert(diseaseMonth)
      .values({
        year: r.year,
        month: r.month,
        diseaseId,
        count: r.count,
      })
      .onConflictDoUpdate({
        target: [diseaseMonth.year, diseaseMonth.month, diseaseMonth.diseaseId],
        set: {
          count: sql`EXCLUDED.count`,
          updatedAt: sql`now()`,
        },
      })
    summary.applied++
  }

  return summary
}
