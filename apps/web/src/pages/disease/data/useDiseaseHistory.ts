import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { diseaseHistoryCacheKey } from './cache-keys.js'

export { diseaseHistoryCacheKey } from './cache-keys.js'

// Year-over-year case totals for one disease. Drives the line chart
// on /diseases/[slug]/history and the trend sparkline on the hero.

export interface DiseaseHistoryRow {
  year: number
  count: number
  counties: number
}

export interface DiseaseHistoryData {
  rows: DiseaseHistoryRow[]
  total: number
  /** Most recent year present in the series, or null if empty. */
  latestYear: number | null
}

export interface UseDiseaseHistoryResult {
  data: DiseaseHistoryData | null
  loading: boolean
  error: Error | null
}

export function useDiseaseHistory(diseaseId: number | null): UseDiseaseHistoryResult {
  const initial = useSSRData<DiseaseHistoryData>(
    diseaseId !== null ? diseaseHistoryCacheKey(diseaseId) : '',
  )
  const [state, setState] = useState<UseDiseaseHistoryResult>(() =>
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

    beam.diseaseCountyYear.analyze
      .casesByYear({ where: { diseaseId } })
      .then((res) => {
        if (cancelled) return
        const rows: DiseaseHistoryRow[] = res.buckets
          .map((b) => ({
            year: Number(b.dims.year),
            count: b.measures.total ?? 0,
            counties: b.measures.counties ?? 0,
          }))
          .filter((r) => Number.isFinite(r.year))
          .sort((a, b) => a.year - b.year)
        const total = rows.reduce((s, r) => s + r.count, 0)
        const latestYear = rows.at(-1)?.year ?? null
        resolvedForRef.current = diseaseId
        setState({ data: { rows, total, latestYear }, loading: false, error: null })
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
