import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { tickRangeCacheKey } from './cache-keys.js'

export { tickRangeCacheKey } from './cache-keys.js'

// Loads the range data for a single tick — both the per-state
// established-counties count (drives the choropleth) and the
// per-year spread (drives the line chart on /range).
//
// `byStateFips` is a plain `Record<string, number>` so the value
// JSON-serializes cleanly through the SSR cache. Hook callers iterate
// it with `Object.entries` / `Object.values` / `Object.keys`.

export interface TickRangeData {
  /** Map of state FIPS → established-counties count for this tick. */
  byStateFips: Record<string, number>
  /** [{ year, counties }] sorted ascending by year. */
  spread: Array<{ year: number; counties: number }>
}

export interface UseTickRangeResult {
  data: TickRangeData | null
  loading: boolean
  error: Error | null
}

export function useTickRange(tickId: number | null): UseTickRangeResult {
  const initial = useSSRData<TickRangeData>(
    tickId !== null ? tickRangeCacheKey(tickId) : '',
  )
  const [state, setState] = useState<UseTickRangeResult>(() =>
    initial
      ? { data: initial, loading: false, error: null }
      : { data: null, loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(initial && tickId !== null ? tickId : null)

  useEffect(() => {
    if (tickId === null) {
      resolvedForRef.current = null
      setState({ data: null, loading: true, error: null })
      return
    }
    if (resolvedForRef.current === tickId) return

    let cancelled = false
    setState({ data: null, loading: true, error: null })

    Promise.all([
      beam.tickCounty.analyze.establishedByState({ where: { tickId } }),
      beam.tickCounty.analyze.spreadOverTime({ where: { tickId } }),
    ])
      .then(([byStateRes, spreadRes]) => {
        if (cancelled) return
        const byStateFips: Record<string, number> = {}
        for (const b of byStateRes.buckets) {
          const fips = String(b.dims.stateFips ?? '')
          if (!fips) continue
          byStateFips[fips] = b.measures.counties ?? 0
        }
        const spread = spreadRes.buckets
          .map((b) => ({
            year: Number(b.dims.year),
            counties: b.measures.counties ?? 0,
          }))
          .filter((r) => Number.isFinite(r.year))
          .sort((a, b) => a.year - b.year)

        resolvedForRef.current = tickId
        setState({ data: { byStateFips, spread }, loading: false, error: null })
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
