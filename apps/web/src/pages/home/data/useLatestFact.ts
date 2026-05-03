import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { homeLatestFactCacheKey } from './cache-keys.js'

export { homeLatestFactCacheKey } from './cache-keys.js'

// Most recent wild fact for the home page rotator card. Pulls page 1
// of `wildFacts.feed.latest` and surfaces item 0 (or null if empty).
// The page hides the card cleanly when the feed is empty.

export interface LatestFactRow {
  id: number
  slug: string
  body: string
  citationUrl: string | null
}

export interface UseLatestFactResult {
  fact: LatestFactRow | null
  loading: boolean
  error: Error | null
}

export function useLatestFact(): UseLatestFactResult {
  const initial = useSSRData<LatestFactRow | null>(homeLatestFactCacheKey())
  const [state, setState] = useState<UseLatestFactResult>(() =>
    initial !== undefined
      ? { fact: initial, loading: false, error: null }
      : { fact: null, loading: true, error: null },
  )

  useEffect(() => {
    if (initial !== undefined) return

    let cancelled = false
    beam.wildFacts.feed
      .latest({ pageSize: 1 })
      .then((page) => {
        if (cancelled) return
        const item = page.items[0]
        if (!item) {
          setState({ fact: null, loading: false, error: null })
          return
        }
        const md = item.metadata as {
          id: number
          slug: string | null
          body: string | null
          citationUrl: string | null
        }
        setState({
          fact: {
            id: md.id,
            slug: md.slug ?? '',
            body: md.body ?? '',
            citationUrl: md.citationUrl ?? null,
          },
          loading: false,
          error: null,
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ fact: null, loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [initial])

  return state
}
