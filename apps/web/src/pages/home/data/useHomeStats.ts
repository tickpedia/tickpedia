import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { homeStatsCacheKey } from './cache-keys.js'

export { homeStatsCacheKey } from './cache-keys.js'

// Site-wide row counts for the home page footer strip. Three lens
// counts in parallel — cheap, no per-row data.

export interface HomeStats {
  ticks: number
  diseases: number
  counties: number
  caseRows: number
}

export interface UseHomeStatsResult {
  stats: HomeStats | null
  loading: boolean
  error: Error | null
}

export function useHomeStats(): UseHomeStatsResult {
  const initial = useSSRData<HomeStats>(homeStatsCacheKey())
  const [state, setState] = useState<UseHomeStatsResult>(() =>
    initial
      ? { stats: initial, loading: false, error: null }
      : { stats: null, loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    Promise.all([
      beam.ticks.count(),
      beam.diseases.count(),
      beam.counties.count(),
      beam.diseaseCountyYear.count(),
    ])
      .then(([t, d, c, r]) => {
        if (cancelled) return
        setState({
          stats: {
            ticks: t.count ?? 0,
            diseases: d.count ?? 0,
            counties: c.count ?? 0,
            caseRows: r.count ?? 0,
          },
          loading: false,
          error: null,
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ stats: null, loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [initial])

  return state
}
