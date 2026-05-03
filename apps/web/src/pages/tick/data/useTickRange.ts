import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'

// Loads the range data for a single tick — both the per-state
// established-counties count (drives the choropleth) and the
// per-year spread (drives the line chart on /range).
//
// Both analyses are fetched in parallel via Promise.all. Sample
// callers pass `tickId = null` while the parent's tick row is
// still loading; this hook short-circuits to {loading: true} until
// a real id arrives.

export interface TickRangeData {
  /** Map of state FIPS → established-counties count for this tick. */
  byStateFips: Map<string, number>
  /** [{ year, counties }] sorted ascending by year. */
  spread: Array<{ year: number; counties: number }>
}

export interface UseTickRangeResult {
  data: TickRangeData | null
  loading: boolean
  error: Error | null
}

export function useTickRange(tickId: number | null): UseTickRangeResult {
  const [state, setState] = useState<UseTickRangeResult>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (tickId === null) {
      setState({ data: null, loading: true, error: null })
      return
    }
    let cancelled = false
    setState({ data: null, loading: true, error: null })

    Promise.all([
      beam.tickCounty.analyze.establishedByState({ where: { tickId } }),
      beam.tickCounty.analyze.spreadOverTime({ where: { tickId } }),
    ])
      .then(([byStateRes, spreadRes]) => {
        if (cancelled) return
        const byStateFips = new Map<string, number>()
        for (const b of byStateRes.buckets) {
          const fips = String(b.dims.stateFips ?? '')
          if (!fips) continue
          byStateFips.set(fips, b.measures.counties ?? 0)
        }
        const spread = spreadRes.buckets
          .map((b) => ({
            year: Number(b.dims.year),
            counties: b.measures.counties ?? 0,
          }))
          .filter((r) => Number.isFinite(r.year))
          .sort((a, b) => a.year - b.year)

        setState({
          data: { byStateFips, spread },
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
  }, [tickId])

  return state
}
