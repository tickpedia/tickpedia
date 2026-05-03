import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { stateTicksCacheKey } from './cache-keys.js'
import {
  readEstablishedBuckets,
  rollupStateTicks,
  type AnalyzeResult,
} from './state-ticks-rollup.js'

export { stateTicksCacheKey } from './cache-keys.js'

// Ticks established (or reported) in a given state. Reads from
// `tickCounty.establishedByState` (CDC-grade, ~1,900 county-tick
// rows) rather than the editorial `tick_state` table, which is
// essentially empty in production. The rollup helper turns the
// (tickId, stateFips, counties) buckets into per-state rows with a
// derived prevalence chip.

export interface StateTickRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
  prevalence: 'high' | 'moderate' | 'low' | null
  /** Established county count in this state — rendered on the card. */
  establishedCounties: number
  /** No real source for this today; kept null for forward compat. */
  peakMonths: number[] | null
}

export interface UseStateTicksResult {
  rows: StateTickRow[]
  loading: boolean
  error: Error | null
}

export function useStateTicks(stateFips: string | null): UseStateTicksResult {
  const initial = useSSRData<StateTickRow[]>(
    stateFips !== null ? stateTicksCacheKey(stateFips) : '',
  )
  const [state, setState] = useState<UseStateTicksResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<string | null>(
    initial && stateFips !== null ? stateFips : null,
  )

  useEffect(() => {
    if (stateFips === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    if (resolvedForRef.current === stateFips) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    Promise.all([
      // The analyze hops `stateFips through county`, so the where
      // filter doesn't push down. Read the full grid and slice
      // client-side via the rollup helper.
      beam.tickCounty.analyze.establishedByState({}) as Promise<
        AnalyzeResult<{ tickId: unknown; stateFips: unknown }, { counties: number }>
      >,
      beam.ticks.query({
        fields: ['id', 'slug', 'commonName', 'scientificName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([analyzeRes, ticksRes]) => {
        if (cancelled) return
        const buckets = readEstablishedBuckets(analyzeRes)
        const rollup = rollupStateTicks(
          stateFips,
          buckets,
          ticksRes.rows.map((t) => ({
            id: t.id,
            slug: t.slug ?? '',
            commonName: t.commonName ?? '',
            scientificName: t.scientificName ?? '',
            oneLiner: t.oneLiner ?? null,
          })),
        )
        resolvedForRef.current = stateFips
        setState({ rows: rollup, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ rows: [], loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [stateFips])

  return state
}
