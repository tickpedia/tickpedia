import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { countyNeighboursCacheKey } from './cache-keys.js'
import {
  pickNearestCounties,
  type CountyWithCentroid,
  type NeighbourRow,
} from './neighbours.js'

export { countyNeighboursCacheKey } from './cache-keys.js'

// 6 closest counties to this one by haversine distance to centroid.
// Border-agnostic — the design's sidebar explicitly does not snap to
// the focal county's parent state.

const NEIGHBOUR_COUNT = 6

export interface CountyNeighbourRow extends NeighbourRow {
  /** Display label like "York, ME". Resolved from the neighbour's stateFips. */
  stateCode: string | null
  /** State slug for the link target. Null when the slug can't be resolved. */
  stateSlug: string | null
}

export interface UseCountyNeighboursResult {
  rows: CountyNeighbourRow[]
  loading: boolean
  error: Error | null
}

export function useCountyNeighbours(
  focal: CountyWithCentroid | null,
): UseCountyNeighboursResult {
  const initial = useSSRData<CountyNeighbourRow[]>(
    focal !== null ? countyNeighboursCacheKey(focal.fips) : '',
  )
  const [state, setState] = useState<UseCountyNeighboursResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<string | null>(
    initial && focal !== null ? focal.fips : null,
  )

  useEffect(() => {
    if (focal === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    if (resolvedForRef.current === focal.fips) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    Promise.all([
      beam.counties.query({
        fields: ['fips', 'slug', 'stateFips', 'countyName', 'latitude', 'longitude'],
        limit: 5000,
      }),
      beam.states.query({
        fields: ['fips', 'code', 'slug'],
        limit: 60,
      }),
    ])
      .then(([countiesRes, statesRes]) => {
        if (cancelled) return
        const stateByFips = new Map<string, { code: string; slug: string }>()
        for (const s of statesRes.rows) {
          if (s.fips) stateByFips.set(s.fips, { code: s.code ?? '', slug: s.slug ?? '' })
        }
        const pool: CountyWithCentroid[] = countiesRes.rows
          .map((c) => ({
            fips: c.fips ?? '',
            slug: c.slug ?? '',
            stateFips: c.stateFips ?? '',
            countyName: c.countyName ?? '',
            latitude: c.latitude ?? null,
            longitude: c.longitude ?? null,
          }))
          .filter((c) => c.fips && c.slug && c.latitude !== null && c.longitude !== null)
        const neighbours = pickNearestCounties(focal, pool, NEIGHBOUR_COUNT)
        const rows: CountyNeighbourRow[] = neighbours.map((n) => {
          const s = stateByFips.get(n.stateFips)
          return {
            ...n,
            stateCode: s?.code ?? null,
            stateSlug: s?.slug ?? null,
          }
        })
        resolvedForRef.current = focal.fips
        setState({ rows, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ rows: [], loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [focal])

  return state
}
