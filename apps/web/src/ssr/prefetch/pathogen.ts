import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { PathogenRow } from '../../pages/pathogen/data/normalize.js'
import type { PathogenTickRow } from '../../pages/pathogen/data/usePathogenTicks.js'
import type { PathogenDiseaseRow } from '../../pages/pathogen/data/usePathogenDiseases.js'
import {
  pathogenCacheKey,
  pathogenCountiesCacheKey,
  pathogenSpreadCacheKey,
  pathogenTicksCacheKey,
  pathogenDiseasesCacheKey,
  pathogensIndexCacheKey,
} from '../../pages/pathogen/data/cache-keys.js'
import { normalizePathogen } from '../../pages/pathogen/data/normalize.js'
import {
  aggregateCounties,
  aggregateSpread,
  composeIndexRows,
  type PathogenCountiesData,
  type PathogenIndexRow,
  type PathogenSpreadData,
} from '../../pages/pathogen/data/aggregates.js'
import { buildPathogenHead, buildPathogensIndexHead } from '../../pages/pathogen/seo.js'

// Build-time prefetch for /pathogens, /pathogens/[slug], and the three
// pathogen sub-pages. Returns null when the slug is unknown.

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

export interface PathogenPagePrefetch {
  cache: DataCache
  head: PageHead
  pathogen: PathogenRow
}

export async function prefetchPathogenPage(
  client: BeamClient,
  slug: string,
): Promise<PathogenPagePrefetch | null> {
  const pathogenRes = (await client.query('pathogens', {
    where: { slug },
    fields: ['id', 'slug', 'displayName', 'scientificName', 'oneLiner', 'aliases'],
    limit: 1,
  })) as QueryResponse<Record<string, unknown>>
  const raw = pathogenRes.rows[0]
  if (!raw) return null
  const pathogen = normalizePathogen(raw)
  const pathogenId = pathogen.id

  const [countyRes, tickJoinRes, ticksRes, diseaseJoinRes, diseasesRes] = await Promise.all([
    client.query('pathogenCounty', {
      where: { pathogenId, status: 'present' },
      fields: ['countyFips', 'year'],
      limit: 5000,
    }) as Promise<QueryResponse<{ countyFips?: string; year?: number }>>,
    client.query('tickPathogens', {
      where: { pathogenId },
      fields: ['tickId'],
      limit: 50,
    }) as Promise<QueryResponse<{ tickId: number }>>,
    client.query('ticks', {
      fields: ['id', 'slug', 'commonName', 'scientificName', 'oneLiner'],
      limit: 100,
    }) as Promise<
      QueryResponse<{
        id: number
        slug: string
        commonName: string
        scientificName: string
        oneLiner: string | null
      }>
    >,
    client.query('diseasePathogens', {
      where: { pathogenId },
      fields: ['diseaseId'],
      limit: 20,
    }) as Promise<QueryResponse<{ diseaseId: number }>>,
    client.query('diseases', {
      fields: ['id', 'slug', 'displayName', 'oneLiner'],
      limit: 100,
    }) as Promise<
      QueryResponse<{
        id: number
        slug: string
        displayName: string
        oneLiner: string | null
      }>
    >,
  ])

  const counties: PathogenCountiesData = aggregateCounties(countyRes.rows)
  const spread: PathogenSpreadData = aggregateSpread(countyRes.rows)

  const tickIds = new Set(tickJoinRes.rows.map((r) => r.tickId))
  const tickRows: PathogenTickRow[] = ticksRes.rows
    .filter((t) => tickIds.has(t.id))
    .map((t) => ({
      id: t.id,
      slug: t.slug ?? '',
      commonName: t.commonName ?? '',
      scientificName: t.scientificName ?? '',
      oneLiner: t.oneLiner ?? null,
    }))
    .sort((a, b) => a.commonName.localeCompare(b.commonName))

  const diseaseIds = new Set(diseaseJoinRes.rows.map((r) => r.diseaseId))
  const diseaseRows: PathogenDiseaseRow[] = diseasesRes.rows
    .filter((d) => diseaseIds.has(d.id))
    .map((d) => ({
      id: d.id,
      slug: d.slug ?? '',
      displayName: d.displayName ?? '',
      oneLiner: d.oneLiner ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const cache: DataCache = {
    [pathogenCacheKey(slug)]: pathogen,
    [pathogenCountiesCacheKey(pathogenId)]: counties,
    [pathogenSpreadCacheKey(pathogenId)]: spread,
    [pathogenTicksCacheKey(pathogenId)]: tickRows,
    [pathogenDiseasesCacheKey(pathogenId)]: diseaseRows,
  }

  const head = buildPathogenHead(pathogen, {
    counties: counties.totalCounties,
    ticks: tickRows.length,
    diseases: diseaseRows.length,
  })

  return { cache, head, pathogen }
}

export interface PathogensIndexPrefetch {
  cache: DataCache
  head: PageHead
}

export async function prefetchPathogensIndex(
  client: BeamClient,
): Promise<PathogensIndexPrefetch> {
  const [pathogensRes, ticksAnalyse, diseasesAnalyse] = await Promise.all([
    client.query('pathogens', {
      fields: ['id', 'slug', 'displayName', 'scientificName', 'oneLiner'],
      limit: 100,
    }) as Promise<
      QueryResponse<{
        id: number
        slug: string | null
        displayName: string | null
        scientificName: string | null
        oneLiner: string | null
      }>
    >,
    client.analyze('tickPathogens', 'ticksPerPathogen', {}) as Promise<
      AnalyzeResult<{ pathogenId: unknown }, { count: number }>
    >,
    client.analyze('diseasePathogens', 'diseasesPerPathogen', {}) as Promise<
      AnalyzeResult<{ pathogenId: unknown }, { count: number }>
    >,
  ])

  const rows: PathogenIndexRow[] = composeIndexRows(
    pathogensRes.rows,
    ticksAnalyse.buckets,
    diseasesAnalyse.buckets,
  )

  return {
    cache: { [pathogensIndexCacheKey()]: rows },
    head: buildPathogensIndexHead(),
  }
}
