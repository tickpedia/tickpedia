import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { diseaseStatesCacheKey } from './cache-keys.js'

export { diseaseStatesCacheKey } from './cache-keys.js'

// Per-state CDC case totals for one disease. Drives the choropleth +
// leaderboard on /diseases/[slug] and /diseases/[slug]/states.

export interface DiseaseStatesData {
  /** Map of state FIPS → cumulative case count. */
  byStateFips: Record<string, number>
  /** Total cases across all states (sum of byStateFips). */
  total: number
  /** Number of distinct states with at least one case. */
  stateCount: number
}

export interface UseDiseaseStatesResult {
  data: DiseaseStatesData | null
  loading: boolean
  error: Error | null
}

export function useDiseaseStates(diseaseId: number | null): UseDiseaseStatesResult {
  const initial = useSSRData<DiseaseStatesData>(
    diseaseId !== null ? diseaseStatesCacheKey(diseaseId) : '',
  )
  const [state, setState] = useState<UseDiseaseStatesResult>(() =>
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
      .casesByState({ where: { diseaseId } })
      .then((res) => {
        if (cancelled) return
        const byStateFips: Record<string, number> = {}
        let total = 0
        for (const b of res.buckets) {
          const fips = String(b.dims.stateFips ?? '')
          if (!fips) continue
          const value = b.measures.total ?? 0
          byStateFips[fips] = (byStateFips[fips] ?? 0) + value
          total += value
        }
        const stateCount = Object.keys(byStateFips).length
        resolvedForRef.current = diseaseId
        setState({
          data: { byStateFips, total, stateCount },
          loading: false,
          error: null,
        })
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
