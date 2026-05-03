import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { StateRow } from '../../pages/state/data/useStateRow.js'
import type { StateTickRow } from '../../pages/state/data/useStateTicks.js'
import type { StateDiseaseRow } from '../../pages/state/data/useStateDiseases.js'
import type { StateCountyRow } from '../../pages/state/data/useStateCounties.js'
import type { StateCountyHotspotRow } from '../../pages/state/data/useStateCountyHotspots.js'
import type { StateIndexRow } from '../../pages/state/data/useStatesIndex.js'
import {
  stateCacheKey,
  stateTicksCacheKey,
  stateDiseasesCacheKey,
  stateCountiesCacheKey,
  stateCountyHotspotsCacheKey,
  statesIndexCacheKey,
} from '../../pages/state/data/cache-keys.js'
import { buildStateHead, buildStatesIndexHead } from '../../pages/state/seo.js'

// Build-time prefetch for /states, /states/[slug], and the three
// state sub-pages. Returns null when the slug is unknown.

interface AnalyzeBucket<D, M> {
  dims: D
  measures: M
}
interface AnalyzeResult<D, M> {
  buckets: Array<AnalyzeBucket<D, M>>
}
interface QueryResponse<T> {
  rows: T[]
}

export interface StatePagePrefetch {
  cache: DataCache
  head: PageHead
  state: StateRow
}

export async function prefetchStatePage(
  client: BeamClient,
  slug: string,
): Promise<StatePagePrefetch | null> {
  const stateRes = (await client.query('states', {
    where: { slug },
    fields: ['fips', 'code', 'slug', 'name'],
    limit: 1,
  })) as QueryResponse<StateRow>
  const state = stateRes.rows[0]
  if (!state) return null

  const stateFips = state.fips

  const [
    tickJoinRes,
    ticksRes,
    diseaseAnalyzeRes,
    diseasesRes,
    countiesRes,
    hotspotsRes,
  ] = await Promise.all([
    client.query('tickState', {
      where: { stateFips },
      fields: ['tickId', 'prevalence', 'peakMonths'],
      limit: 50,
    }) as Promise<QueryResponse<{
      tickId: number
      prevalence: string | null
      peakMonths: number[] | null
    }>>,
    client.query('ticks', {
      fields: ['id', 'slug', 'commonName', 'scientificName', 'oneLiner'],
      limit: 100,
    }) as Promise<QueryResponse<{
      id: number
      slug: string
      commonName: string
      scientificName: string
      oneLiner: string | null
    }>>,
    // stateFips is a hopped dimension on this analysis (through:
    // 'county') — pushdown can't filter on it, so read the full grid
    // and slice client-side below.
    client.analyze('diseaseCountyYear', 'casesByState', {}) as Promise<
      AnalyzeResult<{ diseaseId: number; stateFips: unknown }, { total: number; counties: number; yearsCovered: number }>
    >,
    client.query('diseases', {
      fields: ['id', 'slug', 'displayName', 'oneLiner'],
      limit: 100,
    }) as Promise<QueryResponse<{
      id: number
      slug: string
      displayName: string
      oneLiner: string | null
    }>>,
    client.query('counties', {
      where: { stateFips },
      fields: ['fips', 'slug', 'countyName'],
      limit: 500,
    }) as Promise<QueryResponse<{ fips: string; slug: string; countyName: string }>>,
    // countyHotspots is national top-100; stateFips hop can't be
    // pushed. Filter to this state below.
    client.analyze('diseaseCountyYear', 'countyHotspots', {}) as Promise<AnalyzeResult<{
      countyName: unknown
      countyFips: unknown
      stateFips: unknown
    }, {
      total: number
      mostRecentYear: number
      diseases: number
    }>>,
  ])

  // Ticks rollup
  const tickMeta = new Map<number, { prevalence: string | null; peakMonths: number[] | null }>()
  for (const r of tickJoinRes.rows) {
    tickMeta.set(r.tickId, {
      prevalence: r.prevalence ?? null,
      peakMonths: r.peakMonths ?? null,
    })
  }
  const tickRows: StateTickRow[] = ticksRes.rows
    .filter((t) => tickMeta.has(t.id))
    .map((t) => {
      const m = tickMeta.get(t.id)!
      return {
        id: t.id,
        slug: t.slug ?? '',
        commonName: t.commonName ?? '',
        scientificName: t.scientificName ?? '',
        oneLiner: t.oneLiner ?? null,
        prevalence: m.prevalence,
        peakMonths: m.peakMonths,
      }
    })
    .sort((a, b) => prevalenceRank(b.prevalence) - prevalenceRank(a.prevalence) ||
      a.commonName.localeCompare(b.commonName))

  // Diseases rollup — filter (diseaseId, stateFips) buckets to this state.
  const diseaseStats = new Map<number, { total: number; counties: number; yearsCovered: number }>()
  for (const b of diseaseAnalyzeRes.buckets) {
    if (String(b.dims.stateFips ?? '') !== stateFips) continue
    const id = Number(b.dims.diseaseId)
    if (!Number.isFinite(id)) continue
    const cur = diseaseStats.get(id) ?? { total: 0, counties: 0, yearsCovered: 0 }
    cur.total += b.measures.total ?? 0
    cur.counties = Math.max(cur.counties, b.measures.counties ?? 0)
    cur.yearsCovered = Math.max(cur.yearsCovered, b.measures.yearsCovered ?? 0)
    diseaseStats.set(id, cur)
  }
  const diseaseRows: StateDiseaseRow[] = diseasesRes.rows
    .filter((d) => diseaseStats.has(d.id))
    .map((d) => {
      const s = diseaseStats.get(d.id)!
      return {
        id: d.id,
        slug: d.slug ?? '',
        displayName: d.displayName ?? '',
        oneLiner: d.oneLiner ?? null,
        total: s.total,
        counties: s.counties,
        yearsCovered: s.yearsCovered,
      }
    })
    .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName))

  // Counties
  const countyRows: StateCountyRow[] = countiesRes.rows
    .map((c) => ({
      fips: c.fips ?? '',
      slug: c.slug ?? '',
      countyName: c.countyName ?? '',
    }))
    .sort((a, b) => a.countyName.localeCompare(b.countyName))

  // Hotspots
  const slugByFips = new Map<string, { slug: string; countyName: string }>()
  for (const c of countiesRes.rows) {
    slugByFips.set(c.fips ?? '', { slug: c.slug ?? '', countyName: c.countyName ?? '' })
  }
  const hotspotRows: StateCountyHotspotRow[] = hotspotsRes.buckets
    .filter((b) => String(b.dims.stateFips ?? '') === stateFips)
    .map((b) => {
      const fips = String(b.dims.countyFips ?? '')
      const meta = slugByFips.get(fips)
      return {
        fips,
        slug: meta?.slug ?? '',
        countyName: meta?.countyName ?? String(b.dims.countyName ?? fips),
        total: b.measures.total ?? 0,
        diseases: b.measures.diseases ?? 0,
        mostRecentYear: b.measures.mostRecentYear ?? 0,
      }
    })
    .filter((r) => r.fips && r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)

  const cache: DataCache = {
    [stateCacheKey(slug)]: state,
    [stateTicksCacheKey(stateFips)]: tickRows,
    [stateDiseasesCacheKey(stateFips)]: diseaseRows,
    [stateCountiesCacheKey(stateFips)]: countyRows,
    [stateCountyHotspotsCacheKey(stateFips)]: hotspotRows,
  }

  const head = buildStateHead(state)

  return { cache, head, state }
}

export interface StatesIndexPrefetch {
  cache: DataCache
  head: PageHead
}

export async function prefetchStatesIndex(client: BeamClient): Promise<StatesIndexPrefetch> {
  const res = (await client.query('states', {
    fields: ['fips', 'code', 'slug', 'name'],
    limit: 60,
  })) as QueryResponse<StateIndexRow>
  const rows: StateIndexRow[] = res.rows
    .map((r) => ({
      fips: r.fips ?? '',
      code: r.code ?? '',
      slug: r.slug ?? '',
      name: r.name ?? '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    cache: { [statesIndexCacheKey()]: rows },
    head: buildStatesIndexHead(),
  }
}

function prevalenceRank(p: string | null): number {
  switch ((p ?? '').toLowerCase()) {
    case 'high': return 3
    case 'moderate': return 2
    case 'low': return 1
    default: return 0
  }
}
