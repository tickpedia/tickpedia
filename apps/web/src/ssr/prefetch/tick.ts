import type { BeamClient } from '@semilayer/client'
import type { DataCache } from '../SSRDataProvider.js'
import type { PageHead } from '../../pages/shared/seo/index.js'
import type { TickRow } from '../../pages/tick/data/useTick.js'
import type { TickRangeData } from '../../pages/tick/data/useTickRange.js'
import type { TickDiseaseRow } from '../../pages/tick/data/useTickDiseases.js'
import {
  tickCacheKey,
  tickRangeCacheKey,
  tickDiseasesCacheKey,
} from '../../pages/tick/data/cache-keys.js'
import { buildTickHead } from '../../pages/tick/seo.js'

// Build-time prefetch for /ticks/[slug] (and /ticks/[slug]/range,
// since both pages share the same three reads). Returns null when
// the slug doesn't exist — the caller treats that as "skip this URL".
//
// Uses the raw `BeamClient` rather than the generated `Beam` wrapper
// so this module has no dependency on the `@/beam` path alias —
// the build script (Node + tsx) and the test runner (vitest) both
// resolve `@semilayer/client` cleanly without extra plumbing.

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

export interface TickPagePrefetch {
  cache: DataCache
  head: PageHead
}

export async function prefetchTickPage(
  client: BeamClient,
  slug: string,
): Promise<TickPagePrefetch | null> {
  const tickRes = (await client.query('ticks', {
    where: { slug },
    fields: [
      'id',
      'slug',
      'commonName',
      'scientificName',
      'oneLiner',
      'heroPhotoUrl',
      'heroHeadColor',
      'heroBodyColor',
      'heroLegColor',
      'dangerLevel',
    ],
    limit: 1,
  })) as QueryResponse<TickRow>
  const tick = tickRes.rows[0]
  if (!tick) return null

  const [byStateRes, spreadRes, joinRes, diseasesRes] = await Promise.all([
    client.analyze('tickCounty', 'establishedByState', {
      where: { tickId: tick.id },
    }) as Promise<AnalyzeResult<{ stateFips: unknown }, { counties: number }>>,
    client.analyze('tickCounty', 'spreadOverTime', {
      where: { tickId: tick.id },
    }) as Promise<AnalyzeResult<{ year: number }, { counties: number }>>,
    client.query('tickDiseases', {
      where: { tickId: tick.id },
      fields: ['diseaseId'],
      limit: 50,
    }) as Promise<QueryResponse<{ diseaseId: number }>>,
    client.query('diseases', {
      fields: ['id', 'slug', 'displayName', 'oneLiner'],
      limit: 100,
    }) as Promise<QueryResponse<{ id: number; slug: string; displayName: string; oneLiner: string | null }>>,
  ])

  const byStateFips: Record<string, number> = {}
  for (const b of byStateRes.buckets) {
    const fips = String(b.dims.stateFips ?? '')
    if (!fips) continue
    byStateFips[fips] = b.measures.counties ?? 0
  }
  const spread = spreadRes.buckets
    .map((b) => ({
      year: Number(b.dims.year),
      counties: b.measures.counties ?? 0,
    }))
    .filter((r) => Number.isFinite(r.year))
    .sort((a, b) => a.year - b.year)

  const range: TickRangeData = { byStateFips, spread }

  const ids = new Set(joinRes.rows.map((r) => r.diseaseId))
  const tickDiseases: TickDiseaseRow[] = diseasesRes.rows
    .filter((d) => ids.has(d.id))
    .map((d) => ({
      id: d.id,
      slug: d.slug ?? '',
      displayName: d.displayName ?? '',
      oneLiner: d.oneLiner ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const cache: DataCache = {
    [tickCacheKey(slug)]: tick,
    [tickRangeCacheKey(tick.id)]: range,
    [tickDiseasesCacheKey(tick.id)]: tickDiseases,
  }

  return { cache, head: buildTickHead(tick) }
}
