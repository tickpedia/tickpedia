import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { diseaseSeasonalityCacheKey } from './cache-keys.js'

export { diseaseSeasonalityCacheKey } from './cache-keys.js'
export { pickPeakMonth, type PeakInfo } from './peak-month.js'

// Monthly case totals (Jan..Dec) for one disease. Drives the radial
// seasonality chart and the "Peak · X" hero chip.

export interface DiseaseSeasonalityData {
  /** Length-12 array, Jan..Dec, of cumulative case counts. */
  months: number[]
  /** Total cases across the months series. */
  total: number
}

export interface UseDiseaseSeasonalityResult {
  data: DiseaseSeasonalityData | null
  loading: boolean
  error: Error | null
}

export function useDiseaseSeasonality(diseaseId: number | null): UseDiseaseSeasonalityResult {
  const initial = useSSRData<DiseaseSeasonalityData>(
    diseaseId !== null ? diseaseSeasonalityCacheKey(diseaseId) : '',
  )
  const [state, setState] = useState<UseDiseaseSeasonalityResult>(() =>
    initial
      ? { data: initial, loading: false, error: null }
      : { data: null, loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(initial && diseaseId !== null ? diseaseId : null)

  useEffect(() => {
    if (diseaseId === null) {
      resolvedForRef.current = null
      setState({ data: null, loading: true, error: null })
      return
    }
    if (resolvedForRef.current === diseaseId) return

    let cancelled = false
    setState({ data: null, loading: true, error: null })

    beam.diseaseMonth.analyze
      .seasonality({ where: { diseaseId } })
      .then((res) => {
        if (cancelled) return
        const months = new Array<number>(12).fill(0)
        let total = 0
        for (const b of res.buckets) {
          const m = Number(b.dims.month)
          if (!Number.isFinite(m) || m < 1 || m > 12) continue
          const v = b.measures.total ?? 0
          months[m - 1] = (months[m - 1] ?? 0) + v
          total += v
        }
        resolvedForRef.current = diseaseId
        setState({ data: { months, total }, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ data: null, loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [diseaseId])

  return state
}

