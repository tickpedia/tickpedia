import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { SeasonalityData } from '../../pages/season/data/aggregate.js'
import type { RiskDiseaseRow as CatalogRow } from '../../pages/risk/data/useRiskDiseases.js'
import { aggregateSeasonality } from '../../pages/season/data/aggregate.js'
import { seasonalityCacheKey } from '../../pages/season/data/cache-keys.js'
import { riskDiseasesCacheKey } from '../../pages/risk/data/cache-keys.js'
import { buildSeasonHead } from '../../pages/season/seo.js'

// Build-time prefetch for /season. Pulls the `diseaseMonth.seasonality`
// analysis + the disease catalog (shared cache key with /risk so a
// browser hitting both doesn't refetch).

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

export interface SeasonPrefetch {
  cache: DataCache
  head: PageHead
}

export async function prefetchSeason(client: BeamClient): Promise<SeasonPrefetch> {
  const [seasonRes, diseasesRes] = await Promise.all([
    client.analyze('diseaseMonth', 'seasonality', {}) as Promise<
      AnalyzeResult<{ month?: unknown; diseaseId?: unknown }, { total?: number | null }>
    >,
    client.query('diseases', {
      fields: ['id', 'slug', 'displayName'],
      limit: 50,
    }) as Promise<QueryResponse<{
      id: number
      slug: string | null
      displayName: string | null
    }>>,
  ])

  const data: SeasonalityData = aggregateSeasonality(seasonRes.buckets)

  const diseaseCatalog: CatalogRow[] = diseasesRes.rows
    .map((d) => ({
      id: d.id,
      slug: d.slug ?? '',
      displayName: d.displayName ?? '',
    }))
    .filter((d) => d.slug)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const cache: DataCache = {
    [seasonalityCacheKey()]: data,
    [riskDiseasesCacheKey()]: diseaseCatalog,
  }

  return {
    cache,
    head: buildSeasonHead(),
  }
}
