import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { CountyRow, ParentState } from '../../pages/county/data/useCounty.js'
import type { CountyDiseaseRow } from '../../pages/county/data/useCountyDiseases.js'
import type { CountyTickRow } from '../../pages/county/data/useCountyTicks.js'
import type {
  CountyNeighbourRow,
} from '../../pages/county/data/useCountyNeighbours.js'
import type { LeaderboardRow } from '../../pages/county/data/useCountiesLeaderboard.js'
import {
  countyCacheKey,
  countyDiseasesCacheKey,
  countyTicksCacheKey,
  countyNeighboursCacheKey,
  countiesLeaderboardCacheKey,
} from '../../pages/county/data/cache-keys.js'
import {
  pickNearestCounties,
  type CountyWithCentroid,
} from '../../pages/county/data/neighbours.js'
import { buildCountyHead, buildCountiesLeaderboardHead } from '../../pages/county/seo.js'

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

export interface CountyPagePrefetch {
  cache: DataCache
  head: PageHead
  county: CountyRow
  parentState: ParentState
}

export interface CountyPrefetchContext {
  /** All counties keyed by fips. Shared so 3000+ county pages don't refetch the pool. */
  countiesByFips: Map<string, {
    fips: string
    slug: string
    stateFips: string
    countyName: string
    latitude: number | null
    longitude: number | null
  }>
  /** All states keyed by fips. */
  stateByFips: Map<string, ParentState>
  /** Lookup state by slug. */
  stateBySlug: Map<string, ParentState>
  /** Diseases catalog. Same for every county. */
  diseases: ReadonlyArray<{
    id: number
    slug: string
    displayName: string
    oneLiner: string | null
  }>
  /** Ticks catalog. Same for every county. */
  ticks: ReadonlyArray<{
    id: number
    slug: string
    commonName: string
    scientificName: string
    oneLiner: string | null
  }>
}

export async function buildCountyPrefetchContext(client: BeamClient): Promise<CountyPrefetchContext> {
  const [countiesRes, statesRes, diseasesRes, ticksRes] = await Promise.all([
    client.query('counties', {
      fields: ['fips', 'slug', 'stateFips', 'countyName', 'latitude', 'longitude'],
      limit: 5000,
    }) as Promise<QueryResponse<{
      fips: string
      slug: string
      stateFips: string
      countyName: string
      latitude: number | null
      longitude: number | null
    }>>,
    client.query('states', {
      fields: ['fips', 'slug', 'name', 'code'],
      limit: 60,
    }) as Promise<QueryResponse<ParentState>>,
    client.query('diseases', {
      fields: ['id', 'slug', 'displayName', 'oneLiner'],
      limit: 100,
    }) as Promise<QueryResponse<{
      id: number
      slug: string
      displayName: string
      oneLiner: string | null
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
  ])

  const countiesByFips = new Map<string, ReturnType<typeof normalizeCounty>>()
  for (const c of countiesRes.rows) {
    if (c.fips) countiesByFips.set(c.fips, normalizeCounty(c))
  }
  const stateByFips = new Map<string, ParentState>()
  const stateBySlug = new Map<string, ParentState>()
  for (const s of statesRes.rows) {
    if (s.fips) stateByFips.set(s.fips, s)
    if (s.slug) stateBySlug.set(s.slug, s)
  }
  return {
    countiesByFips,
    stateByFips,
    stateBySlug,
    diseases: diseasesRes.rows.map((d) => ({
      id: d.id,
      slug: d.slug ?? '',
      displayName: d.displayName ?? '',
      oneLiner: d.oneLiner ?? null,
    })),
    ticks: ticksRes.rows.map((t) => ({
      id: t.id,
      slug: t.slug ?? '',
      commonName: t.commonName ?? '',
      scientificName: t.scientificName ?? '',
      oneLiner: t.oneLiner ?? null,
    })),
  }
}

function normalizeCounty(c: {
  fips: string
  slug: string
  stateFips: string
  countyName: string
  latitude: number | null
  longitude: number | null
}) {
  return {
    fips: c.fips ?? '',
    slug: c.slug ?? '',
    stateFips: c.stateFips ?? '',
    countyName: c.countyName ?? '',
    latitude: c.latitude ?? null,
    longitude: c.longitude ?? null,
  }
}

export async function prefetchCountyPage(
  client: BeamClient,
  stateSlug: string,
  countySlug: string,
  ctx?: CountyPrefetchContext,
): Promise<CountyPagePrefetch | null> {
  const context = ctx ?? (await buildCountyPrefetchContext(client))
  const parentState = context.stateBySlug.get(stateSlug)
  if (!parentState) return null

  // Find county by (slug, stateFips) in the shared pool.
  let countyRaw: ReturnType<typeof normalizeCounty> | undefined
  for (const c of context.countiesByFips.values()) {
    if (c.slug === countySlug && c.stateFips === parentState.fips) {
      countyRaw = c
      break
    }
  }
  if (!countyRaw) return null

  const county: CountyRow = {
    fips: countyRaw.fips ?? '',
    slug: countyRaw.slug ?? '',
    stateFips: countyRaw.stateFips ?? '',
    countyName: countyRaw.countyName ?? '',
    latitude: countyRaw.latitude ?? null,
    longitude: countyRaw.longitude ?? null,
  }
  const countyFips = county.fips

  // Per-county lens reads. The diseases + ticks catalogs come from
  // the shared context — they're identical for every county.
  const [diseaseRes, tickJoinRes] = await Promise.all([
    client.analyze('diseaseCountyYear', 'casesByYear', {
      where: { countyFips },
    }) as Promise<AnalyzeResult<{ diseaseId: number; year: number }, { total: number; counties: number }>>,
    client.query('tickCounty', {
      where: { countyFips },
      fields: ['tickId', 'status', 'year'],
      limit: 100,
    }) as Promise<QueryResponse<{
      tickId: number
      status: string | null
      year: number | null
    }>>,
  ])
  const diseasesRes = { rows: context.diseases }
  const ticksRes = { rows: context.ticks }

  // Diseases rollup
  const stats = new Map<number, { total: number; latestYear: number }>()
  for (const b of diseaseRes.buckets) {
    const id = Number(b.dims.diseaseId)
    if (!Number.isFinite(id)) continue
    const cur = stats.get(id) ?? { total: 0, latestYear: 0 }
    cur.total += b.measures.total ?? 0
    cur.latestYear = Math.max(cur.latestYear, Number(b.dims.year) || 0)
    stats.set(id, cur)
  }
  const diseaseRows: CountyDiseaseRow[] = diseasesRes.rows
    .filter((d) => stats.has(d.id))
    .map((d) => {
      const s = stats.get(d.id)!
      return {
        id: d.id,
        slug: d.slug ?? '',
        displayName: d.displayName ?? '',
        oneLiner: d.oneLiner ?? null,
        total: s.total,
        latestYear: s.latestYear,
      }
    })
    .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName))

  // Ticks rollup
  const tickMeta = new Map<number, { status: string | null; earliestYear: number | null }>()
  for (const r of tickJoinRes.rows) {
    const cur = tickMeta.get(r.tickId) ?? { status: null, earliestYear: null }
    cur.status = strongerStatus(cur.status, r.status ?? null)
    if (typeof r.year === 'number') {
      cur.earliestYear = cur.earliestYear === null ? r.year : Math.min(cur.earliestYear, r.year)
    }
    tickMeta.set(r.tickId, cur)
  }
  const tickRows: CountyTickRow[] = ticksRes.rows
    .filter((t) => tickMeta.has(t.id))
    .map((t) => {
      const m = tickMeta.get(t.id)!
      return {
        id: t.id,
        slug: t.slug ?? '',
        commonName: t.commonName ?? '',
        scientificName: t.scientificName ?? '',
        oneLiner: t.oneLiner ?? null,
        status: m.status,
        earliestYear: m.earliestYear,
      }
    })
    .sort((a, b) => statusRank(b.status) - statusRank(a.status) ||
      a.commonName.localeCompare(b.commonName))

  // Neighbours — reuse the shared counties pool from the context.
  const focal: CountyWithCentroid = {
    fips: county.fips,
    slug: county.slug,
    stateFips: county.stateFips,
    countyName: county.countyName,
    latitude: county.latitude,
    longitude: county.longitude,
  }
  const pool: CountyWithCentroid[] = []
  for (const c of context.countiesByFips.values()) {
    if (c.fips && c.slug && c.latitude !== null && c.longitude !== null) {
      pool.push(c)
    }
  }
  const neighbourRows: CountyNeighbourRow[] = pickNearestCounties(focal, pool, 6).map((n) => {
    const s = context.stateByFips.get(n.stateFips)
    return {
      ...n,
      stateCode: s?.code ?? null,
      stateSlug: s?.slug ?? null,
    }
  })

  const cache: DataCache = {
    [countyCacheKey(stateSlug, countySlug)]: { county, parentState },
    [countyDiseasesCacheKey(countyFips)]: diseaseRows,
    [countyTicksCacheKey(countyFips)]: tickRows,
    [countyNeighboursCacheKey(countyFips)]: neighbourRows,
  }

  const head = buildCountyHead(county, parentState)

  return { cache, head, county, parentState }
}

export interface CountiesLeaderboardPrefetch {
  cache: DataCache
  head: PageHead
}

export async function prefetchCountiesLeaderboard(
  client: BeamClient,
): Promise<CountiesLeaderboardPrefetch> {
  const [hotspotsRes, countiesRes, statesRes] = await Promise.all([
    client.analyze('diseaseCountyYear', 'countyHotspots', {}) as Promise<AnalyzeResult<{
      countyName: unknown
      countyFips: unknown
      stateFips: unknown
    }, {
      total: number
      mostRecentYear: number
      diseases: number
    }>>,
    client.query('counties', {
      fields: ['fips', 'slug', 'countyName', 'stateFips'],
      limit: 5000,
    }) as Promise<QueryResponse<{
      fips: string
      slug: string
      countyName: string
      stateFips: string
    }>>,
    client.query('states', {
      fields: ['fips', 'slug', 'code'],
      limit: 60,
    }) as Promise<QueryResponse<{ fips: string; slug: string; code: string }>>,
  ])

  const stateByFips = new Map<string, { slug: string; code: string }>()
  for (const s of statesRes.rows) {
    if (s.fips) stateByFips.set(s.fips, { slug: s.slug ?? '', code: s.code ?? '' })
  }
  const countyByFips = new Map<string, { slug: string; countyName: string; stateFips: string }>()
  for (const c of countiesRes.rows) {
    if (c.fips) {
      countyByFips.set(c.fips, {
        slug: c.slug ?? '',
        countyName: c.countyName ?? '',
        stateFips: c.stateFips ?? '',
      })
    }
  }
  const rows: LeaderboardRow[] = hotspotsRes.buckets
    .map((b) => {
      const fips = String(b.dims.countyFips ?? '')
      const county = countyByFips.get(fips)
      const state = county ? stateByFips.get(county.stateFips) : undefined
      return {
        fips,
        slug: county?.slug ?? '',
        countyName: county?.countyName ?? String(b.dims.countyName ?? fips),
        stateSlug: state?.slug ?? '',
        stateCode: state?.code ?? '',
        total: b.measures.total ?? 0,
        diseases: b.measures.diseases ?? 0,
        mostRecentYear: b.measures.mostRecentYear ?? 0,
      }
    })
    .filter((r) => r.fips && r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 100)

  return {
    cache: { [countiesLeaderboardCacheKey()]: rows },
    head: buildCountiesLeaderboardHead(),
  }
}

function statusRank(s: string | null): number {
  switch ((s ?? '').toLowerCase()) {
    case 'established': return 3
    case 'reported': return 2
    case 'no records': return 1
    default: return 0
  }
}

function strongerStatus(a: string | null, b: string | null): string | null {
  return statusRank(a) >= statusRank(b) ? a : b
}
