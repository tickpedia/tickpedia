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

// Confirmed-garbage FIPS values that CDC publishes in their TBD files —
// we skip them silently rather than spamming the import summary every
// run. Each entry should have a comment naming the bad cell and what we
// believe the source error is.
const KNOWN_BOGUS_FIPS = new Set<string>([
  // Appears as "District of Columbia / Montgomery" in AllTBD*. Real DC
  // is 11001 and Montgomery County (MD) is 24031 — the 11031 cell is a
  // misjoined state(11) + county-suffix(031) and references no real
  // place. Reported upstream; until they fix it, ignore.
  '11031',
])

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

  // 3. Resolve every row in-memory first so we can batch the writes.
  //    A single 3000-row CDC file expands to ~28,000 long rows; one round
  //    trip per row times out the serverless function on Vercel. Building
  //    the array up-front and chunking the upserts keeps it under the
  //    function timeout.
  type Pending = {
    countyFips: string
    diseaseId: number
    year: number
    count: number
  }
  const pending: Pending[] = []

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

    // Per-row gates (cheap to check once, costly to repeat per disease).
    const fipsForRow = longRows[0]?.countyFips ?? null
    if (fipsForRow && KNOWN_BOGUS_FIPS.has(fipsForRow)) {
      summary.skipped++
      continue
    }
    if (fipsForRow && !knownFips.has(fipsForRow)) {
      summary.errors.push({
        row: i + 1,
        reason: `Unknown county FIPS ${fipsForRow} (${longRows[0]?.stateName ?? ''} / ${longRows[0]?.countyName ?? ''})`,
        raw,
      })
      continue
    }

    for (const lr of longRows) {
      const diseaseId = slugToId.get(lr.diseaseSlug)
      if (!diseaseId) {
        summary.errors.push({
          row: i + 1,
          reason: `Unknown disease "${lr.rawDiseaseColumn}" (slug: ${lr.diseaseSlug}). Add it to seeds/diseases.ts and reseed.`,
          raw,
        })
        continue
      }

      pending.push({
        countyFips: lr.countyFips,
        diseaseId,
        year: lr.year,
        count: lr.count,
      })
    }
  }

  // 4. Batched upsert. Natural-key unique index makes this idempotent —
  //    re-runs bump count + updated_at instead of inserting duplicates.
  const CHUNK = 500
  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK)
    await db
      .insert(diseaseCountyYear)
      .values(chunk)
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
    summary.applied += chunk.length
  }

  return summary
}
