import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { factRelatedCacheKey } from './cache-keys.js'

export { factRelatedCacheKey } from './cache-keys.js'

// "More like this" rail — wildFacts.feeds.relatedTo ranks against the
// seed fact's stored embedding (mode: recordVector — zero embed cost).
// Returns up to N facts ordered by similarity, excluding the seed.
//
// When the seed has no embedding (or the lens is empty), the feed
// returns 0 items and the rail hides cleanly.

export interface RelatedFactRow {
  id: number
  slug: string
  body: string
  citationUrl: string | null
}

export interface UseFactRelatedResult {
  rows: RelatedFactRow[]
  loading: boolean
  error: Error | null
}

const RELATED_PAGE_SIZE = 6

export function useFactRelated(factId: number | null): UseFactRelatedResult {
  const initial = useSSRData<RelatedFactRow[]>(
    factId !== null ? factRelatedCacheKey(factId) : '',
  )
  const [state, setState] = useState<UseFactRelatedResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(initial && factId !== null ? factId : null)

  useEffect(() => {
    if (factId === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    if (resolvedForRef.current === factId) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    beam.wildFacts.feed
      .relatedTo({
        context: { seedRecordId: String(factId) },
        pageSize: RELATED_PAGE_SIZE,
      })
      .then((page) => {
        if (cancelled) return
        const rows: RelatedFactRow[] = page.items.map((item) => {
          const md = item.metadata as {
            id: number
            slug: string | null
            body: string | null
            citationUrl: string | null
          }
          return {
            id: md.id,
            slug: md.slug ?? '',
            body: md.body ?? '',
            citationUrl: md.citationUrl ?? null,
          }
        })
        resolvedForRef.current = factId
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
  }, [factId])

  return state
}
