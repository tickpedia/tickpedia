import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { seasonalityCacheKey } from './cache-keys.js'
import {
  aggregateSeasonality,
  type RawSeasonalityBucket,
  type SeasonalityData,
} from './aggregate.js'

export { seasonalityCacheKey } from './cache-keys.js'
export {
  aggregateSeasonality,
  type SeasonalityData,
  type RawSeasonalityBucket,
} from './aggregate.js'

// Cross-disease monthly seasonality for /season. Sums the per-disease
// month buckets into a single 12-element array (Jan..Dec). Plus a
// per-disease summary list with each disease's peak month.

export interface UseSeasonalityResult {
  data: SeasonalityData | null
  loading: boolean
  error: Error | null
}

export function useSeasonality(): UseSeasonalityResult {
  const initial = useSSRData<SeasonalityData>(seasonalityCacheKey())
  const [state, setState] = useState<UseSeasonalityResult>(() =>
    initial
      ? { data: initial, loading: false, error: null }
      : { data: null, loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    beam.diseaseMonth.analyze
      .seasonality()
      .then((res) => {
        if (cancelled) return
        const data = aggregateSeasonality(res.buckets as RawSeasonalityBucket[])
        setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ data: null, loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [initial])

  return state
}
