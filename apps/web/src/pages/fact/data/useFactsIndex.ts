import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { factsIndexCacheKey } from './cache-keys.js'
import { composeIndexRows, type FactsIndexRow } from './compose-index.js'

export { factsIndexCacheKey } from './cache-keys.js'
export type { FactsIndexRow } from './compose-index.js'

// /facts index — page 1 of wildFacts.feeds.latest (recency-ranked,
// pageSize 20). Pagination beyond page 1 fetches client-side via the
// `next(cursor)` handle on demand.
//
// Each row carries the `wildFact` envelope plus a small set of
// resolved entity-chip refs (ticks / diseases / techniques) for the
// inline preview chips. Resolving the chips client-side from three
// catalog reads keeps the SSR cache compact.

export interface UseFactsIndexResult {
  rows: FactsIndexRow[]
  loading: boolean
  error: Error | null
}

export function useFactsIndex(): UseFactsIndexResult {
  const initial = useSSRData<FactsIndexRow[]>(factsIndexCacheKey())
  const [state, setState] = useState<UseFactsIndexResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    Promise.all([
      beam.wildFacts.feed.latest({ pageSize: 20 }),
      beam.wildFacts.query({
        fields: ['id', 'slug', 'body', 'citationUrl'],
        limit: 20,
      }),
      beam.wildFactTicks.query({ fields: ['wildFactId', 'tickId'], limit: 1000 }),
      beam.wildFactDiseases.query({ fields: ['wildFactId', 'diseaseId'], limit: 1000 }),
      beam.wildFactRemovalTechniques.query({
        fields: ['wildFactId', 'removalTechniqueId'],
        limit: 1000,
      }),
      beam.ticks.query({ fields: ['id', 'slug', 'commonName'], limit: 100 }),
      beam.diseases.query({ fields: ['id', 'slug', 'displayName'], limit: 100 }),
      beam.removalTechniques.query({ fields: ['id', 'slug', 'title'], limit: 50 }),
    ])
      .then(([feed, factsCatalog, tickJoin, diseaseJoin, techniqueJoin, ticks, diseases, techniques]) => {
        if (cancelled) return
        const feedMetas = feed.items.length > 0
          ? feed.items.map((i) => i.metadata as {
              id: number
              slug: string | null
              body: string | null
              citationUrl: string | null
            })
          : factsCatalog.rows.map((r) => ({
              id: r.id,
              slug: r.slug ?? null,
              body: r.body ?? null,
              citationUrl: r.citationUrl ?? null,
            }))
        const rows = composeIndexRows(
          feedMetas,
          tickJoin.rows,
          diseaseJoin.rows,
          techniqueJoin.rows,
          ticks.rows,
          diseases.rows,
          techniques.rows,
        )
        setState({ rows, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ rows: [], loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [initial])

  return state
}
