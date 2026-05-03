import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { homeHeatmapCacheKey } from './cache-keys.js'

export { homeHeatmapCacheKey } from './cache-keys.js'

// Raw `densityByH3` buckets. The hook returns the raw shape; callers
// project to canvas via `bucketsToCells` from the chart helper. Keeps
// the hook lean of chart-specific concerns and lets /risk reuse the
// same pull at a different canvas size.

export interface DensityBucket {
  h3Cell: string
  total: number
  counties: number
  diseases: number
}

export interface UseDensityResult {
  buckets: DensityBucket[]
  loading: boolean
  error: Error | null
}

interface RawBucket {
  dims: { h3Cell?: unknown }
  measures: { total?: number | null; counties?: number | null; diseases?: number | null }
}

export function useHomeHeatmap(): UseDensityResult {
  const initial = useSSRData<DensityBucket[]>(homeHeatmapCacheKey())
  const [state, setState] = useState<UseDensityResult>(() =>
    initial
      ? { buckets: initial, loading: false, error: null }
      : { buckets: [], loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    beam.diseaseCountyYear.analyze
      .densityByH3()
      .then((res) => {
        if (cancelled) return
        const buckets = normalizeBuckets(res.buckets as RawBucket[])
        setState({ buckets, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ buckets: [], loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [initial])

  return state
}

export function normalizeBuckets(raw: ReadonlyArray<RawBucket>): DensityBucket[] {
  const out: DensityBucket[] = []
  for (const b of raw) {
    const h3Cell = typeof b.dims.h3Cell === 'string' ? b.dims.h3Cell : ''
    if (!h3Cell) continue
    out.push({
      h3Cell,
      total: b.measures.total ?? 0,
      counties: b.measures.counties ?? 0,
      diseases: b.measures.diseases ?? 0,
    })
  }
  return out
}
