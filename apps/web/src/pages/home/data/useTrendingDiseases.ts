import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { homeTrendingCacheKey } from './cache-keys.js'

export { homeTrendingCacheKey } from './cache-keys.js'

// Engagement-ranked diseases for the home rail. Backed by the
// `diseases.feed.trending` feed (engagement = sum of cases through
// `diseaseCountyYear.countyStats`, linear decay).

export interface TrendingDiseaseRow {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
  /** Final composite score from the feed (mostly for debug). */
  score: number
}

export interface UseTrendingResult {
  rows: TrendingDiseaseRow[]
  loading: boolean
  error: Error | null
}

const TRENDING_PAGE_SIZE = 5

export function useTrendingDiseases(): UseTrendingResult {
  const initial = useSSRData<TrendingDiseaseRow[]>(homeTrendingCacheKey())
  const [state, setState] = useState<UseTrendingResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    beam.diseases.feed
      .trending({ pageSize: TRENDING_PAGE_SIZE })
      .then((page) => {
        if (cancelled) return
        const rows: TrendingDiseaseRow[] = page.items.map((item) => {
          const md = item.metadata as {
            id: number
            slug: string | null
            displayName: string | null
            oneLiner: string | null
          }
          return {
            id: md.id,
            slug: md.slug ?? '',
            displayName: md.displayName ?? '',
            oneLiner: md.oneLiner ?? null,
            score: item.score ?? 0,
          }
        })
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
