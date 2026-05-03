import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { DensityBucket } from '../../pages/home/data/useHomeHeatmap.js'
import type { RiskHotspotRow } from '../../pages/risk/data/useRiskHotspots.js'
import type { RiskDiseaseRow as CatalogRow } from '../../pages/risk/data/useRiskDiseases.js'
import type { RiskDiseaseRow as DiseasePageRow } from '../../pages/risk/data/useRiskDisease.js'
import {
  riskHeatmapCacheKey,
  riskHotspotsCacheKey,
  riskDiseasesCacheKey,
  riskDiseasePageCacheKey,
} from '../../pages/risk/data/cache-keys.js'
import { buildRiskHead, buildRiskDiseaseHead } from '../../pages/risk/seo.js'

// Build-time prefetch for /risk and /risk/[slug]. /risk pulls the
// unfiltered heatmap + hotspots + disease catalog. /risk/[slug] adds
// the disease row + a filtered heatmap on top of the same shared
// `RiskPrefetchContext`.

interface QueryResponse<T> {
  rows: T[]
}
interface AnalyzeBucket<D, M> {
  dims: D
  measures: M
}
interface AnalyzeResult<D, M> {
  buckets: Array<AnalyzeBucket<D, M>>
}

type DensityBucketRaw = AnalyzeBucket<
  { h3Cell?: unknown },
  { total?: number; counties?: number; diseases?: number }
>

interface RawDiseaseRow {
  id: number
  slug: string | null
  displayName: string | null
  oneLiner: string | null
}

interface RawCountyRow {
  fips: string | null
  slug: string | null
  countyName: string | null
  stateFips: string | null
}

interface RawStateRow {
  fips: string | null
  slug: string | null
  code: string | null
}

export interface RiskPrefetchContext {
  diseasesById: Map<number, RawDiseaseRow>
  diseasesBySlug: Map<string, RawDiseaseRow>
  diseaseCatalog: CatalogRow[]
  hotspotRows: RiskHotspotRow[]
  unfilteredBuckets: DensityBucket[]
}

export async function buildRiskPrefetchContext(
  client: BeamClient,
): Promise<RiskPrefetchContext> {
  const [
    diseasesRes,
    densityRes,
    hotspotsRes,
    countiesRes,
    statesRes,
  ] = await Promise.all([
    client.query('diseases', {
      fields: ['id', 'slug', 'displayName', 'oneLiner'],
      limit: 50,
    }) as Promise<QueryResponse<RawDiseaseRow>>,
    client.analyze('diseaseCountyYear', 'densityByH3', {}) as Promise<
      AnalyzeResult<{ h3Cell?: unknown }, { total?: number; counties?: number; diseases?: number }>
    >,
    client.analyze('diseaseCountyYear', 'countyHotspots', {}) as Promise<
      AnalyzeResult<
        { countyFips?: unknown; stateFips?: unknown; countyName?: unknown },
        { total?: number; mostRecentYear?: number; diseases?: number }
      >
    >,
    client.query('counties', {
      fields: ['fips', 'slug', 'countyName', 'stateFips'],
      limit: 5000,
    }) as Promise<QueryResponse<RawCountyRow>>,
    client.query('states', {
      fields: ['fips', 'slug', 'code'],
      limit: 60,
    }) as Promise<QueryResponse<RawStateRow>>,
  ])

  const diseasesById = new Map<number, RawDiseaseRow>()
  const diseasesBySlug = new Map<string, RawDiseaseRow>()
  for (const d of diseasesRes.rows) {
    diseasesById.set(d.id, d)
    if (d.slug) diseasesBySlug.set(d.slug, d)
  }

  const diseaseCatalog: CatalogRow[] = diseasesRes.rows
    .map((d) => ({
      id: d.id,
      slug: d.slug ?? '',
      displayName: d.displayName ?? '',
    }))
    .filter((d) => d.slug)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const unfilteredBuckets = normalizeDensity(densityRes.buckets)

  const stateByFips = new Map(statesRes.rows.map((s) => [s.fips ?? '', s]))
  const countyByFips = new Map(countiesRes.rows.map((c) => [c.fips ?? '', c]))

  const hotspotRows: RiskHotspotRow[] = hotspotsRes.buckets
    .map((b) => {
      const fips = String((b.dims as { countyFips?: unknown }).countyFips ?? '')
      const county = countyByFips.get(fips)
      const stateFips =
        (b.dims as { stateFips?: unknown }).stateFips ?? county?.stateFips ?? ''
      const state =
        typeof stateFips === 'string' ? stateByFips.get(stateFips) : undefined
      return {
        fips,
        slug: county?.slug ?? '',
        countyName: county?.countyName ?? '',
        stateSlug: state?.slug ?? '',
        stateCode: state?.code ?? '',
        total: b.measures.total ?? 0,
        diseases: b.measures.diseases ?? 0,
        mostRecentYear: b.measures.mostRecentYear ?? 0,
      }
    })
    .filter((r) => r.fips && r.slug && r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)

  return {
    diseasesById,
    diseasesBySlug,
    diseaseCatalog,
    hotspotRows,
    unfilteredBuckets,
  }
}

export interface RiskIndexPrefetch {
  cache: DataCache
  head: PageHead
}

export async function prefetchRiskIndex(
  client: BeamClient,
  ctx?: RiskPrefetchContext,
): Promise<RiskIndexPrefetch> {
  const context = ctx ?? (await buildRiskPrefetchContext(client))
  const cache: DataCache = {
    [riskHeatmapCacheKey()]: context.unfilteredBuckets,
    [riskHotspotsCacheKey()]: context.hotspotRows,
    [riskDiseasesCacheKey()]: context.diseaseCatalog,
  }
  return {
    cache,
    head: buildRiskHead(),
  }
}

export interface RiskDiseasePrefetch {
  cache: DataCache
  head: PageHead
  disease: DiseasePageRow
}

export async function prefetchRiskDiseasePage(
  client: BeamClient,
  slug: string,
  ctx?: RiskPrefetchContext,
): Promise<RiskDiseasePrefetch | null> {
  const context = ctx ?? (await buildRiskPrefetchContext(client))
  const raw = context.diseasesBySlug.get(slug)
  if (!raw) return null

  const filteredRes = (await client.analyze('diseaseCountyYear', 'densityByH3', {
    where: { diseaseId: raw.id },
  })) as AnalyzeResult<
    { h3Cell?: unknown },
    { total?: number; counties?: number; diseases?: number }
  >
  const filteredBuckets = normalizeDensity(filteredRes.buckets)

  const disease: DiseasePageRow = {
    id: raw.id,
    slug: raw.slug ?? slug,
    displayName: raw.displayName ?? '',
    oneLiner: raw.oneLiner ?? null,
  }

  const cache: DataCache = {
    [riskDiseasePageCacheKey(slug)]: disease,
    [riskHeatmapCacheKey(slug)]: filteredBuckets,
    [riskHeatmapCacheKey()]: context.unfilteredBuckets,
    [riskDiseasesCacheKey()]: context.diseaseCatalog,
  }

  return {
    cache,
    head: buildRiskDiseaseHead(disease),
    disease,
  }
}

function normalizeDensity(raw: ReadonlyArray<DensityBucketRaw>): DensityBucket[] {
  const out: DensityBucket[] = []
  for (const b of raw) {
    const h3Cell = typeof b.dims.h3Cell === 'string' ? b.dims.h3Cell : ''
    if (!h3Cell) continue
    out.push({
      h3Cell,
      total: b.measures.total ?? 0,
      counties: b.measures.counties ?? 0,
      diseases: b.measures.diseases ?? 0,
    })
  }
  return out
}
