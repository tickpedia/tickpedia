import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { HomeStats } from '../../pages/home/data/useHomeStats.js'
import type { DensityBucket } from '../../pages/home/data/useHomeHeatmap.js'
import type { TrendingDiseaseRow } from '../../pages/home/data/useTrendingDiseases.js'
import type { LatestFactRow } from '../../pages/home/data/useLatestFact.js'
import type { RecentlyEstablishedRow } from '../../pages/home/data/useRecentlyEstablished.js'
import {
  homeStatsCacheKey,
  homeHeatmapCacheKey,
  homeTrendingCacheKey,
  homeLatestFactCacheKey,
  homeRecentlyEstablishedCacheKey,
} from '../../pages/home/data/cache-keys.js'
import { buildHomeHead } from '../../pages/home/seo.js'

// Build-time prefetch for `/`. Mirrors the home page's five hooks
// against the BeamClient and writes one cache entry per hook.

interface QueryResponse<T> {
  rows: T[]
}
interface CountResponse {
  count: number
}
interface AnalyzeBucket<D, M> {
  dims: D
  measures: M
}
interface AnalyzeResult<D, M> {
  buckets: Array<AnalyzeBucket<D, M>>
}
interface FeedItem<M> {
  score?: number
  metadata: M
}
interface FeedPage<M> {
  items: FeedItem<M>[]
}

export interface HomePrefetch {
  cache: DataCache
  head: PageHead
}

export async function prefetchHome(client: BeamClient): Promise<HomePrefetch> {
  const [
    ticksCount,
    diseasesCount,
    countiesCount,
    casesCount,
    densityRes,
    trendingRes,
    latestRes,
    recentRes,
    ticksRes,
    countiesRes,
    statesRes,
  ] = await Promise.all([
    client.count('ticks') as Promise<CountResponse>,
    client.count('diseases') as Promise<CountResponse>,
    client.count('counties') as Promise<CountResponse>,
    client.count('diseaseCountyYear') as Promise<CountResponse>,
    client.analyze('diseaseCountyYear', 'densityByH3', {}) as Promise<
      AnalyzeResult<{ h3Cell?: unknown }, { total?: number; counties?: number; diseases?: number }>
    >,
    client.feed('diseases', 'trending', { pageSize: 5 }) as Promise<
      FeedPage<{
        id: number
        slug: string | null
        displayName: string | null
        oneLiner: string | null
      }>
    >,
    client.feed('wildFacts', 'latest', { pageSize: 1 }) as Promise<
      FeedPage<{
        id: number
        slug: string | null
        body: string | null
        citationUrl: string | null
      }>
    >,
    client.feed('tickCounty', 'recentlyEstablished', { pageSize: 6 }) as Promise<
      FeedPage<{
        tickId: number
        countyFips: string | null
        year: number | null
      }>
    >,
    client.query('ticks', {
      fields: ['id', 'slug', 'commonName'],
      limit: 100,
    }) as Promise<QueryResponse<{ id: number; slug: string | null; commonName: string | null }>>,
    client.query('counties', {
      fields: ['fips', 'slug', 'countyName', 'stateFips'],
      limit: 5000,
    }) as Promise<QueryResponse<{
      fips: string | null
      slug: string | null
      countyName: string | null
      stateFips: string | null
    }>>,
    client.query('states', {
      fields: ['fips', 'slug', 'code'],
      limit: 60,
    }) as Promise<QueryResponse<{ fips: string | null; slug: string | null; code: string | null }>>,
  ])

  const stats: HomeStats = {
    ticks: ticksCount.count ?? 0,
    diseases: diseasesCount.count ?? 0,
    counties: countiesCount.count ?? 0,
    caseRows: casesCount.count ?? 0,
  }

  const buckets: DensityBucket[] = []
  for (const b of densityRes.buckets) {
    const h3Cell = typeof b.dims.h3Cell === 'string' ? b.dims.h3Cell : ''
    if (!h3Cell) continue
    buckets.push({
      h3Cell,
      total: b.measures.total ?? 0,
      counties: b.measures.counties ?? 0,
      diseases: b.measures.diseases ?? 0,
    })
  }

  const trending: TrendingDiseaseRow[] = trendingRes.items.map((item) => ({
    id: item.metadata.id,
    slug: item.metadata.slug ?? '',
    displayName: item.metadata.displayName ?? '',
    oneLiner: item.metadata.oneLiner ?? null,
    score: item.score ?? 0,
  }))

  const latestItem = latestRes.items[0]
  const latestFact: LatestFactRow | null = latestItem
    ? {
        id: latestItem.metadata.id,
        slug: latestItem.metadata.slug ?? '',
        body: latestItem.metadata.body ?? '',
        citationUrl: latestItem.metadata.citationUrl ?? null,
      }
    : null

  const tickById = new Map(ticksRes.rows.map((t) => [t.id, t]))
  const countyByFips = new Map(countiesRes.rows.map((c) => [c.fips ?? '', c]))
  const stateByFips = new Map(statesRes.rows.map((s) => [s.fips ?? '', s]))

  const recently: RecentlyEstablishedRow[] = recentRes.items
    .map((item) => {
      const md = item.metadata
      const county = md.countyFips ? countyByFips.get(md.countyFips) : undefined
      const state = county ? stateByFips.get(county.stateFips ?? '') : undefined
      const tick = tickById.get(md.tickId)
      if (!county || !state || !tick) return null
      return {
        countyFips: md.countyFips ?? '',
        countySlug: county.slug ?? '',
        countyName: county.countyName ?? '',
        stateCode: state.code ?? '',
        stateSlug: state.slug ?? '',
        tickName: tick.commonName ?? '',
        tickSlug: tick.slug ?? '',
        year: md.year ?? null,
      } satisfies RecentlyEstablishedRow
    })
    .filter((r): r is RecentlyEstablishedRow => r !== null)

  const cache: DataCache = {
    [homeStatsCacheKey()]: stats,
    [homeHeatmapCacheKey()]: buckets,
    [homeTrendingCacheKey()]: trending,
    [homeLatestFactCacheKey()]: latestFact,
    [homeRecentlyEstablishedCacheKey()]: recently,
  }

  return {
    cache,
    head: buildHomeHead(),
  }
}
