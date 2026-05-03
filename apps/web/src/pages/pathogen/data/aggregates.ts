// Pure aggregators for the pathogen data hooks. Live in their own
// module — no React, no `beam` import — so the prerender script can
// pull them in from a Node entrypoint without dragging the
// browser-side SemiLayer client through tsx's path resolver.
//
// The hooks in this directory and the prefetch helper at
// `src/ssr/prefetch/pathogen.ts` both import from here so the math
// stays in one place.

export interface PathogenCountiesData {
  /** Map of state FIPS → distinct county count where pathogen is present. */
  byStateFips: Record<string, number>
  /** Total distinct counties (sum of byStateFips). */
  totalCounties: number
  /** Number of distinct states with at least one detection. */
  stateCount: number
  /** Latest year present in the data. */
  latestYear: number | null
}

export interface PathogenCountyRow {
  countyFips?: string
  year?: number
  status?: string
}

export interface PathogenSpreadRow {
  year: number
  counties: number
}

export interface PathogenSpreadData {
  rows: PathogenSpreadRow[]
}

export interface PathogenIndexRow {
  id: number
  slug: string
  displayName: string
  scientificName: string
  oneLiner: string | null
  tickCount: number
  diseaseCount: number
}

interface RawPathogenRow {
  id: number
  slug?: string | null
  displayName?: string | null
  scientificName?: string | null
  oneLiner?: string | null
}

interface AnalyzeBucket {
  dims: { pathogenId?: unknown }
  measures: { count?: number }
}

/**
 * Bucket presence rows into per-state distinct-county counts.
 */
export function aggregateCounties(rows: readonly PathogenCountyRow[]): PathogenCountiesData {
  const seenCounties = new Set<string>()
  const seenPerState = new Map<string, Set<string>>()
  let latestYear: number | null = null

  for (const row of rows) {
    const fips = typeof row.countyFips === 'string' ? row.countyFips : ''
    if (!fips) continue
    seenCounties.add(fips)
    const stateFips = fips.slice(0, 2)
    if (!seenPerState.has(stateFips)) seenPerState.set(stateFips, new Set())
    seenPerState.get(stateFips)!.add(fips)
    const year = typeof row.year === 'number' ? row.year : null
    if (year !== null && Number.isFinite(year)) {
      if (latestYear === null || year > latestYear) latestYear = year
    }
  }

  const byStateFips: Record<string, number> = {}
  for (const [stateFips, counties] of seenPerState) {
    byStateFips[stateFips] = counties.size
  }

  return {
    byStateFips,
    totalCounties: seenCounties.size,
    stateCount: seenPerState.size,
    latestYear,
  }
}

/**
 * Cumulative-by-year spread: per year, the number of distinct counties
 * with at least one detection in that year *or any prior year*.
 */
export function aggregateSpread(rows: readonly PathogenCountyRow[]): PathogenSpreadData {
  const byYear = new Map<number, Set<string>>()
  const allYears = new Set<number>()

  for (const row of rows) {
    const fips = typeof row.countyFips === 'string' ? row.countyFips : ''
    const year = typeof row.year === 'number' ? row.year : null
    if (!fips || year === null || !Number.isFinite(year)) continue
    allYears.add(year)
    if (!byYear.has(year)) byYear.set(year, new Set())
    byYear.get(year)!.add(fips)
  }

  const sortedYears = [...allYears].sort((a, b) => a - b)
  const cumulative = new Set<string>()
  const result: PathogenSpreadRow[] = []
  for (const year of sortedYears) {
    for (const fips of byYear.get(year) ?? []) cumulative.add(fips)
    result.push({ year, counties: cumulative.size })
  }

  return { rows: result }
}

/**
 * Pure index composer. Joins pathogens with the per-pathogen tick +
 * disease counts, sorted alphabetically by displayName.
 */
export function composeIndexRows(
  pathogens: readonly RawPathogenRow[],
  ticksPerPathogen: readonly AnalyzeBucket[],
  diseasesPerPathogen: readonly AnalyzeBucket[],
): PathogenIndexRow[] {
  const ticksById = new Map<number, number>()
  for (const b of ticksPerPathogen) {
    const id = Number(b.dims.pathogenId)
    if (!Number.isFinite(id)) continue
    ticksById.set(id, b.measures.count ?? 0)
  }
  const diseasesById = new Map<number, number>()
  for (const b of diseasesPerPathogen) {
    const id = Number(b.dims.pathogenId)
    if (!Number.isFinite(id)) continue
    diseasesById.set(id, b.measures.count ?? 0)
  }

  return pathogens
    .map((p) => ({
      id: p.id,
      slug: p.slug ?? '',
      displayName: p.displayName ?? '',
      scientificName: p.scientificName ?? '',
      oneLiner: p.oneLiner ?? null,
      tickCount: ticksById.get(p.id) ?? 0,
      diseaseCount: diseasesById.get(p.id) ?? 0,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
