// Pure rollup: turn a `tickCounty.establishedByState` analyze result
// + a `ticks` lens snapshot into per-state tick rows.
//
// Why we own this client + server: the editorial `tick_state` table
// is essentially empty (1 row in production at the time this
// landed), so reading from it shows "Established ticks: 0" on every
// state. CDC's `tickCounty` data is rich (~1,900 established
// county-tick rows), and aggregating by state gives a real answer:
// each (tickId, stateFips) bucket carries the established-county
// count for that pair.
//
// Prevalence is derived from the county count, since we have no
// editorial signal:
//   high     ≥ 30 counties established (state-wide presence)
//   moderate 10–29 counties (regional)
//   low      1–9 counties (frontier / new establishment)

export interface EstablishedBucket {
  tickId: number
  stateFips: string
  counties: number
}

export interface TickLensRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
}

export interface StateTickRollupRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
  /** Derived from establishedCounties — `high`, `moderate`, `low`, or `null`. */
  prevalence: 'high' | 'moderate' | 'low' | null
  /** Number of counties in this state where the tick is `established`. */
  establishedCounties: number
  /** Editorial peak months are out of source — left null until we
   *  have a per-state seasonality lens. */
  peakMonths: number[] | null
}

export interface AnalyzeBucket<D, M> {
  dims: D
  measures: M
}
export interface AnalyzeResult<D, M> {
  buckets: ReadonlyArray<AnalyzeBucket<D, M>>
}

/** Distill the `tickCounty.establishedByState` buckets to one row per
 *  (tickId, stateFips) tuple. Defensive on shape — Bridge sometimes
 *  returns string for stateFips and number for tickId. */
export function readEstablishedBuckets(
  result: AnalyzeResult<{ tickId: unknown; stateFips: unknown }, { counties: number }>,
): EstablishedBucket[] {
  const out: EstablishedBucket[] = []
  for (const b of result.buckets) {
    const tickId = Number(b.dims.tickId)
    const stateFips = String(b.dims.stateFips ?? '')
    const counties = b.measures.counties ?? 0
    if (!Number.isFinite(tickId) || !stateFips || counties <= 0) continue
    out.push({ tickId, stateFips, counties })
  }
  return out
}

/** Compose state-tick rows for a single state from a buckets list +
 *  a ticks lens snapshot. Sorted prevalence-high-first then alpha. */
export function rollupStateTicks(
  stateFips: string,
  buckets: readonly EstablishedBucket[],
  ticks: readonly TickLensRow[],
): StateTickRollupRow[] {
  const countiesByTick = new Map<number, number>()
  for (const b of buckets) {
    if (b.stateFips !== stateFips) continue
    const prev = countiesByTick.get(b.tickId) ?? 0
    countiesByTick.set(b.tickId, prev + b.counties)
  }

  const rows: StateTickRollupRow[] = []
  for (const t of ticks) {
    const counties = countiesByTick.get(t.id)
    if (!counties || counties <= 0) continue
    rows.push({
      id: t.id,
      slug: t.slug,
      commonName: t.commonName,
      scientificName: t.scientificName,
      oneLiner: t.oneLiner,
      prevalence: prevalenceFromCounties(counties),
      establishedCounties: counties,
      peakMonths: null,
    })
  }

  rows.sort(
    (a, b) =>
      prevalenceRank(b.prevalence) - prevalenceRank(a.prevalence) ||
      b.establishedCounties - a.establishedCounties ||
      a.commonName.localeCompare(b.commonName),
  )
  return rows
}

export function prevalenceFromCounties(counties: number): 'high' | 'moderate' | 'low' | null {
  if (counties >= 30) return 'high'
  if (counties >= 10) return 'moderate'
  if (counties >= 1) return 'low'
  return null
}

export function prevalenceRank(p: 'high' | 'moderate' | 'low' | null): number {
  switch (p) {
    case 'high': return 3
    case 'moderate': return 2
    case 'low': return 1
    default: return 0
  }
}
