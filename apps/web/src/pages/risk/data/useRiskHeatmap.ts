import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { riskHeatmapCacheKey } from './cache-keys.js'
import {
  normalizeBuckets,
  type DensityBucket,
} from '../../home/data/useHomeHeatmap.js'

export { riskHeatmapCacheKey } from './cache-keys.js'
export type { DensityBucket } from '../../home/data/useHomeHeatmap.js'

// /risk and /risk/[disease-slug] heatmap reads. Same lens call as the
// home heatmap, but a different cache key (so the home + /risk pages
// don't share state) and an optional `where: { diseaseId }` filter.
//
// `diseaseId` is native on the `diseaseCountyYear` lens table, so the
// pushdown filters successfully for the disease-filtered map.

export interface UseRiskHeatmapResult {
  buckets: DensityBucket[]
  loading: boolean
  error: Error | null
}

export function useRiskHeatmap(
  diseaseId: number | null,
  diseaseSlug?: string,
): UseRiskHeatmapResult {
  const cacheKey = diseaseSlug ? riskHeatmapCacheKey(diseaseSlug) : riskHeatmapCacheKey()
  const initial = useSSRData<DensityBucket[]>(cacheKey)
  const [state, setState] = useState<UseRiskHeatmapResult>(() =>
    initial
      ? { buckets: initial, loading: false, error: null }
      : { buckets: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<string | null>(initial ? cacheKey : null)

  useEffect(() => {
    if (resolvedForRef.current === cacheKey) return

    let cancelled = false
    setState({ buckets: [], loading: true, error: null })

    const params: { where?: { diseaseId: number } } = {}
    if (diseaseId !== null) params.where = { diseaseId }

    beam.diseaseCountyYear.analyze
      .densityByH3(params)
      .then((res) => {
        if (cancelled) return
        const buckets = normalizeBuckets(
          res.buckets as Array<{
            dims: { h3Cell?: unknown }
            measures: { total?: number | null; counties?: number | null; diseases?: number | null }
          }>,
        )
        resolvedForRef.current = cacheKey
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
  }, [cacheKey, diseaseId])

  return state
}
