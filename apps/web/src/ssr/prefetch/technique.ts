import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { TechniqueRow, TechniqueKind } from '../../pages/technique/data/useTechnique.js'
import { normalizeTechnique } from '../../pages/technique/data/useTechnique.js'
import type { TechniqueTickRow } from '../../pages/technique/data/useTechniqueTicks.js'
import type { TechniqueDiseaseRow } from '../../pages/technique/data/useTechniqueDiseases.js'
import type { TechniqueIndexRow } from '../../pages/technique/data/useTechniquesIndex.js'
import {
  techniqueCacheKey,
  techniqueTicksCacheKey,
  techniqueDiseasesCacheKey,
  techniquesIndexCacheKey,
} from '../../pages/technique/data/cache-keys.js'
import { buildTechniqueHead, buildTechniquesIndexHead } from '../../pages/technique/seo.js'

// Build-time prefetch for /techniques and /techniques/[slug]. Returns
// null when the slug is unknown — the caller skips that URL.

interface QueryResponse<T> {
  rows: T[]
}

export interface TechniquePagePrefetch {
  cache: DataCache
  head: PageHead
  technique: TechniqueRow
}

export async function prefetchTechniquePage(
  client: BeamClient,
  slug: string,
): Promise<TechniquePagePrefetch | null> {
  const techniqueRes = (await client.query('removalTechniques', {
    where: { slug },
    fields: [
      'id',
      'slug',
      'title',
      'oneLiner',
      'steps',
      'sourceUrl',
      'kind',
      'preventionScore',
      'citations',
    ],
    limit: 1,
  })) as QueryResponse<Record<string, unknown>>
  const raw = techniqueRes.rows[0]
  if (!raw) return null
  const technique: TechniqueRow = normalizeTechnique(raw)

  const techniqueId = technique.id

  const [tickJoinRes, ticksRes] = await Promise.all([
    client.query('tickRemovalTechniques', {
      where: { removalTechniqueId: techniqueId },
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
  ])

  const tickIdSet = new Set(tickJoinRes.rows.map((r) => r.tickId))
  const tickRows: TechniqueTickRow[] = ticksRes.rows
    .filter((t) => tickIdSet.has(t.id))
    .map((t) => ({
      id: t.id,
      slug: t.slug ?? '',
      commonName: t.commonName ?? '',
      scientificName: t.scientificName ?? '',
      oneLiner: t.oneLiner ?? null,
    }))
    .sort((a, b) => a.commonName.localeCompare(b.commonName))

  // Disease rail derivation: only fire the join lookup when we have
  // ticks to bridge through. Empty applies-to → empty prevents.
  let diseaseRows: TechniqueDiseaseRow[] = []
  if (tickRows.length > 0) {
    const tickIds = tickRows.map((t) => t.id)
    const [tickDiseaseRes, diseasesRes] = await Promise.all([
      client.query('tickDiseases', {
        where: { tickId: { $in: tickIds } },
        fields: ['diseaseId'],
        limit: 200,
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
    const diseaseIdSet = new Set(tickDiseaseRes.rows.map((r) => r.diseaseId))
    diseaseRows = diseasesRes.rows
      .filter((d) => diseaseIdSet.has(d.id))
      .map((d) => ({
        id: d.id,
        slug: d.slug ?? '',
        displayName: d.displayName ?? '',
        oneLiner: d.oneLiner ?? null,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  const cache: DataCache = {
    [techniqueCacheKey(slug)]: technique,
    [techniqueTicksCacheKey(techniqueId)]: tickRows,
    [techniqueDiseasesCacheKey(techniqueId)]: diseaseRows,
  }

  return { cache, head: buildTechniqueHead(technique), technique }
}

export interface TechniquesIndexPrefetch {
  cache: DataCache
  head: PageHead
}

export async function prefetchTechniquesIndex(
  client: BeamClient,
): Promise<TechniquesIndexPrefetch> {
  const res = (await client.query('removalTechniques', {
    fields: ['id', 'slug', 'title', 'oneLiner', 'kind', 'preventionScore'],
    limit: 500,
  })) as QueryResponse<Record<string, unknown>>

  const ALLOWED: readonly TechniqueKind[] = [
    'removal',
    'prevention',
    'aftercare',
    'diagnostic',
    'myth',
  ]
  const rows: TechniqueIndexRow[] = res.rows
    .map((r) => {
      const kindRaw = typeof r.kind === 'string' ? r.kind : 'removal'
      const kind: TechniqueKind = (ALLOWED as readonly string[]).includes(kindRaw)
        ? (kindRaw as TechniqueKind)
        : 'removal'
      const score =
        kind === 'prevention' && typeof r.preventionScore === 'number'
          ? r.preventionScore
          : null
      return {
        id: typeof r.id === 'number' ? r.id : 0,
        slug: typeof r.slug === 'string' ? r.slug : '',
        title: typeof r.title === 'string' ? r.title : '',
        oneLiner: typeof r.oneLiner === 'string' ? r.oneLiner : null,
        kind,
        preventionScore: score,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))

  return {
    cache: { [techniquesIndexCacheKey()]: rows },
    head: buildTechniquesIndexHead(),
  }
}
