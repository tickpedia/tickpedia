import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { FactRow } from '../../pages/fact/data/useFact.js'
import type {
  FactRefs,
  FactTickRef,
  FactDiseaseRef,
  FactTechniqueRef,
} from '../../pages/fact/data/useFactRefs.js'
import type { RelatedFactRow } from '../../pages/fact/data/useFactRelated.js'
import type { FactsIndexRow } from '../../pages/fact/data/compose-index.js'
import type { EntityFactRow } from '../../pages/fact/data/useEntityFacts.js'
import {
  factCacheKey,
  factRefsCacheKey,
  factRelatedCacheKey,
  factsIndexCacheKey,
  entityFactsCacheKey,
} from '../../pages/fact/data/cache-keys.js'
import { composeIndexRows } from '../../pages/fact/data/compose-index.js'
import { buildFactHead, buildFactsIndexHead } from '../../pages/fact/seo.js'

// Build-time prefetch for /facts and /facts/[slug]. The shared
// `FactPrefetchContext` carries the entity catalogs (ticks, diseases,
// techniques) plus the full set of join rows so each fact-page
// prefetch is just two cheap reads (the fact row + the relatedTo
// feed). Mirrors the county-prefetch shape from phase 8.

interface QueryResponse<T> {
  rows: T[]
}

interface FeedItem<M> {
  metadata: M
}

interface FeedPage<M> {
  items: FeedItem<M>[]
}

export interface FactPrefetchContext {
  ticksById: Map<number, FactTickRef>
  diseasesById: Map<number, FactDiseaseRef>
  techniquesById: Map<number, FactTechniqueRef>
  /** Wild-fact-id → tick-ids attached. */
  factTicks: Map<number, number[]>
  /** Wild-fact-id → disease-ids attached. */
  factDiseases: Map<number, number[]>
  /** Wild-fact-id → technique-ids attached. */
  factTechniques: Map<number, number[]>
  /** Tick-id → wild-fact-ids attached (reverse, for retro-fit rails). */
  ticksToFacts: Map<number, number[]>
  diseasesToFacts: Map<number, number[]>
  techniquesToFacts: Map<number, number[]>
  /** Catalog of wild facts (all rows, capped at 200 — the seed is small). */
  facts: FactRow[]
}

interface RawTickRow {
  id: number
  slug: string | null
  commonName: string | null
  scientificName: string | null
  oneLiner: string | null
}
interface RawDiseaseRow {
  id: number
  slug: string | null
  displayName: string | null
  oneLiner: string | null
}
interface RawTechniqueRow {
  id: number
  slug: string | null
  title: string | null
  oneLiner: string | null
}
interface RawFactRow {
  id: number
  slug: string | null
  body: string | null
  citationUrl: string | null
  createdAt: string | null
  updatedAt: string | null
}

export async function buildFactPrefetchContext(client: BeamClient): Promise<FactPrefetchContext> {
  const [
    ticksRes,
    diseasesRes,
    techniquesRes,
    factsRes,
    tickJoinRes,
    diseaseJoinRes,
    techniqueJoinRes,
  ] = await Promise.all([
    client.query('ticks', {
      fields: ['id', 'slug', 'commonName', 'scientificName', 'oneLiner'],
      limit: 100,
    }) as Promise<QueryResponse<RawTickRow>>,
    client.query('diseases', {
      fields: ['id', 'slug', 'displayName', 'oneLiner'],
      limit: 100,
    }) as Promise<QueryResponse<RawDiseaseRow>>,
    client.query('removalTechniques', {
      fields: ['id', 'slug', 'title', 'oneLiner'],
      limit: 50,
    }) as Promise<QueryResponse<RawTechniqueRow>>,
    client.query('wildFacts', {
      fields: ['id', 'slug', 'body', 'citationUrl', 'createdAt', 'updatedAt'],
      limit: 200,
    }) as Promise<QueryResponse<RawFactRow>>,
    client.query('wildFactTicks', {
      fields: ['wildFactId', 'tickId'],
      limit: 1000,
    }) as Promise<QueryResponse<{ wildFactId: number; tickId: number }>>,
    client.query('wildFactDiseases', {
      fields: ['wildFactId', 'diseaseId'],
      limit: 1000,
    }) as Promise<QueryResponse<{ wildFactId: number; diseaseId: number }>>,
    client.query('wildFactRemovalTechniques', {
      fields: ['wildFactId', 'removalTechniqueId'],
      limit: 1000,
    }) as Promise<QueryResponse<{ wildFactId: number; removalTechniqueId: number }>>,
  ])

  const ticksById = new Map<number, FactTickRef>()
  for (const t of ticksRes.rows) {
    ticksById.set(t.id, {
      id: t.id,
      slug: t.slug ?? '',
      commonName: t.commonName ?? '',
      scientificName: t.scientificName ?? '',
      oneLiner: t.oneLiner ?? null,
    })
  }
  const diseasesById = new Map<number, FactDiseaseRef>()
  for (const d of diseasesRes.rows) {
    diseasesById.set(d.id, {
      id: d.id,
      slug: d.slug ?? '',
      displayName: d.displayName ?? '',
      oneLiner: d.oneLiner ?? null,
    })
  }
  const techniquesById = new Map<number, FactTechniqueRef>()
  for (const tq of techniquesRes.rows) {
    techniquesById.set(tq.id, {
      id: tq.id,
      slug: tq.slug ?? '',
      title: tq.title ?? '',
      oneLiner: tq.oneLiner ?? null,
    })
  }

  const factTicks = bucketize(tickJoinRes.rows, (r) => r.wildFactId, (r) => r.tickId)
  const factDiseases = bucketize(
    diseaseJoinRes.rows,
    (r) => r.wildFactId,
    (r) => r.diseaseId,
  )
  const factTechniques = bucketize(
    techniqueJoinRes.rows,
    (r) => r.wildFactId,
    (r) => r.removalTechniqueId,
  )
  const ticksToFacts = bucketize(tickJoinRes.rows, (r) => r.tickId, (r) => r.wildFactId)
  const diseasesToFacts = bucketize(
    diseaseJoinRes.rows,
    (r) => r.diseaseId,
    (r) => r.wildFactId,
  )
  const techniquesToFacts = bucketize(
    techniqueJoinRes.rows,
    (r) => r.removalTechniqueId,
    (r) => r.wildFactId,
  )

  const facts: FactRow[] = factsRes.rows.map((r) => ({
    id: r.id,
    slug: r.slug ?? '',
    body: r.body ?? '',
    citationUrl: r.citationUrl ?? null,
    createdAt: r.createdAt ?? null,
    updatedAt: r.updatedAt ?? null,
  }))

  return {
    ticksById,
    diseasesById,
    techniquesById,
    factTicks,
    factDiseases,
    factTechniques,
    ticksToFacts,
    diseasesToFacts,
    techniquesToFacts,
    facts,
  }
}

function bucketize<T>(
  rows: ReadonlyArray<T>,
  keyFn: (r: T) => number,
  valFn: (r: T) => number,
): Map<number, number[]> {
  const out = new Map<number, number[]>()
  for (const r of rows) {
    const k = keyFn(r)
    const v = valFn(r)
    const cur = out.get(k)
    if (cur) cur.push(v)
    else out.set(k, [v])
  }
  return out
}

export interface FactPagePrefetch {
  cache: DataCache
  head: PageHead
  fact: FactRow
}

export async function prefetchFactPage(
  client: BeamClient,
  slug: string,
  ctx?: FactPrefetchContext,
): Promise<FactPagePrefetch | null> {
  const context = ctx ?? (await buildFactPrefetchContext(client))
  const fact = context.facts.find((f) => f.slug === slug)
  if (!fact) return null

  const refs = resolveRefs(fact.id, context)

  const relatedPage = (await client.feed('wildFacts', 'relatedTo', {
    context: { seedRecordId: String(fact.id) },
    pageSize: 6,
  })) as FeedPage<{
    id: number
    slug: string | null
    body: string | null
    citationUrl: string | null
  }>
  const relatedRows: RelatedFactRow[] = relatedPage.items.map((item) => ({
    id: item.metadata.id,
    slug: item.metadata.slug ?? '',
    body: item.metadata.body ?? '',
    citationUrl: item.metadata.citationUrl ?? null,
  }))

  const cache: DataCache = {
    [factCacheKey(slug)]: fact,
    [factRefsCacheKey(fact.id)]: refs,
    [factRelatedCacheKey(fact.id)]: relatedRows,
  }

  return {
    cache,
    head: buildFactHead(fact, refs),
    fact,
  }
}

function resolveRefs(factId: number, ctx: FactPrefetchContext): FactRefs {
  return {
    ticks: (ctx.factTicks.get(factId) ?? [])
      .map((id) => ctx.ticksById.get(id))
      .filter((t): t is FactTickRef => Boolean(t))
      .sort((a, b) => a.commonName.localeCompare(b.commonName)),
    diseases: (ctx.factDiseases.get(factId) ?? [])
      .map((id) => ctx.diseasesById.get(id))
      .filter((d): d is FactDiseaseRef => Boolean(d))
      .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    techniques: (ctx.factTechniques.get(factId) ?? [])
      .map((id) => ctx.techniquesById.get(id))
      .filter((tq): tq is FactTechniqueRef => Boolean(tq))
      .sort((a, b) => a.title.localeCompare(b.title)),
  }
}

export interface FactsIndexPrefetch {
  cache: DataCache
  head: PageHead
}

export async function prefetchFactsIndex(
  client: BeamClient,
  ctx?: FactPrefetchContext,
): Promise<FactsIndexPrefetch> {
  const context = ctx ?? (await buildFactPrefetchContext(client))

  // Page 1 from feed.latest. Fall back to the catalog when the feed
  // returns nothing (or errors). The recency-ranked feed will be empty
  // when the seed is older than the configured half-life — falling
  // back to the catalog keeps the index meaningful regardless.
  let feedMetas: ReadonlyArray<{
    id: number
    slug: string
    body: string
    citationUrl: string | null
  }> = []
  try {
    const page = (await client.feed('wildFacts', 'latest', { pageSize: 20 })) as FeedPage<{
      id: number
      slug: string | null
      body: string | null
      citationUrl: string | null
    }>
    feedMetas = page.items.map((item) => ({
      id: item.metadata.id,
      slug: item.metadata.slug ?? '',
      body: item.metadata.body ?? '',
      citationUrl: item.metadata.citationUrl ?? null,
    }))
  } catch {
    feedMetas = []
  }
  if (feedMetas.length === 0) {
    feedMetas = context.facts.slice(0, 20).map((f) => ({
      id: f.id,
      slug: f.slug,
      body: f.body,
      citationUrl: f.citationUrl,
    }))
  }

  const tickJoinFlat = flatten(context.factTicks, (factId, tickId) => ({
    wildFactId: factId,
    tickId,
  }))
  const diseaseJoinFlat = flatten(context.factDiseases, (factId, diseaseId) => ({
    wildFactId: factId,
    diseaseId,
  }))
  const techniqueJoinFlat = flatten(
    context.factTechniques,
    (factId, removalTechniqueId) => ({
      wildFactId: factId,
      removalTechniqueId,
    }),
  )

  const tickCatalog = [...context.ticksById.values()].map((t) => ({
    id: t.id,
    slug: t.slug,
    commonName: t.commonName,
  }))
  const diseaseCatalog = [...context.diseasesById.values()].map((d) => ({
    id: d.id,
    slug: d.slug,
    displayName: d.displayName,
  }))
  const techniqueCatalog = [...context.techniquesById.values()].map((tq) => ({
    id: tq.id,
    slug: tq.slug,
    title: tq.title,
  }))

  const rows: FactsIndexRow[] = composeIndexRows(
    feedMetas,
    tickJoinFlat,
    diseaseJoinFlat,
    techniqueJoinFlat,
    tickCatalog,
    diseaseCatalog,
    techniqueCatalog,
  )

  return {
    cache: { [factsIndexCacheKey()]: rows },
    head: buildFactsIndexHead(),
  }
}

function flatten<V>(
  m: Map<number, number[]>,
  build: (factId: number, valId: number) => V,
): V[] {
  const out: V[] = []
  for (const [factId, vals] of m.entries()) {
    for (const v of vals) out.push(build(factId, v))
  }
  return out
}

/**
 * Per-entity facts rail rows for the retro-fit (tick / disease /
 * technique pages). Pure: derived from the shared context.
 */
export function entityFactRows(
  kind: 'tick' | 'disease' | 'technique',
  entityId: number,
  ctx: FactPrefetchContext,
): EntityFactRow[] {
  const reverse =
    kind === 'tick'
      ? ctx.ticksToFacts
      : kind === 'disease'
        ? ctx.diseasesToFacts
        : ctx.techniquesToFacts
  const factIds = reverse.get(entityId) ?? []
  if (factIds.length === 0) return []
  const factsById = new Map(ctx.facts.map((f) => [f.id, f]))
  return factIds
    .map((id) => factsById.get(id))
    .filter((f): f is FactRow => Boolean(f))
    .map((f) => ({
      id: f.id,
      slug: f.slug,
      body: f.body,
      citationUrl: f.citationUrl,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

export function entityFactsCacheEntry(
  kind: 'tick' | 'disease' | 'technique',
  entityId: number,
  ctx: FactPrefetchContext,
): { key: string; rows: EntityFactRow[] } {
  return {
    key: entityFactsCacheKey(kind, entityId),
    rows: entityFactRows(kind, entityId, ctx),
  }
}
