// Ingest CDC wide-format county-year disease counts.
//
// Re-running the same file is a no-op for unchanged rows; ON CONFLICT
// natural key (county_fips, disease_id, year) updates the count and
// bumps updated_at. Unknown disease columns are reported as errors so
// the admin can extend `seeds/diseases.ts` and re-import.
//
// `rowToLong` does the wide → long conversion + slugifies the disease
// column. We resolve the slug to a `diseases.id` here.

import { sql } from 'drizzle-orm'
import type { Db } from '../connect.js'
import { diseaseCountyYear, diseases, counties } from '../schema.js'
import { rowToLong, type RawCountyRow } from './cdc-county.js'
import { emptySummary, type IngestSummary } from './summary.js'

export interface CdcCountyImportInput {
  rows: RawCountyRow[]
  year: number
}

export async function ingestCdcCountyYear(
  db: Db,
  input: CdcCountyImportInput,
): Promise<IngestSummary> {
  const summary = emptySummary()

  // 1. Build slug → diseaseId map up front (small table, ~10 rows).
  const allDiseases = await db
    .select({ id: diseases.id, slug: diseases.slug, aliases: diseases.aliases })
    .from(diseases)
  const slugToId = new Map<string, number>()
  for (const d of allDiseases) {
    slugToId.set(d.slug, d.id)
    for (const alias of d.aliases) slugToId.set(alias, d.id)
  }

  // 2. Build a set of known county FIPS so we can skip orphaned rows
  //    cleanly instead of blowing up on an FK violation.
  const allCounties = await db.select({ fips: counties.fips }).from(counties)
  const knownFips = new Set(allCounties.map((c) => c.fips))

  for (let i = 0; i < input.rows.length; i++) {
    const raw = input.rows[i]
    if (!raw) continue
    let longRows
    try {
      longRows = rowToLong(raw, input.year)
    } catch (err) {
      summary.errors.push({
        row: i + 1,
        reason: err instanceof Error ? err.message : String(err),
        raw,
      })
      continue
    }

    for (const lr of longRows) {
      if (!knownFips.has(lr.countyFips)) {
        summary.errors.push({
          row: i + 1,
          reason: `Unknown county FIPS ${lr.countyFips} (${lr.stateName} / ${lr.countyName})`,
          raw,
        })
        continue
      }

      const diseaseId = slugToId.get(lr.diseaseSlug)
      if (!diseaseId) {
        summary.errors.push({
          row: i + 1,
          reason: `Unknown disease "${lr.rawDiseaseColumn}" (slug: ${lr.diseaseSlug}). Add it to seeds/diseases.ts and reseed.`,
          raw,
        })
        continue
      }

      // Natural-key unique index makes this idempotent — re-runs bump
      // count + updated_at instead of inserting duplicate rows.
      await db
        .insert(diseaseCountyYear)
        .values({
          countyFips: lr.countyFips,
          diseaseId,
          year: lr.year,
          count: lr.count,
        })
        .onConflictDoUpdate({
          target: [
            diseaseCountyYear.countyFips,
            diseaseCountyYear.diseaseId,
            diseaseCountyYear.year,
          ],
          set: {
            count: sql`EXCLUDED.count`,
            updatedAt: sql`now()`,
          },
        })
      summary.applied++
    }
  }

  return summary
}
