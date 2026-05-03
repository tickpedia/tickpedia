import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { stateCountyHotspotsCacheKey } from './cache-keys.js'

export { stateCountyHotspotsCacheKey } from './cache-keys.js'

// Top counties in a state by cumulative tick-borne disease load.
// Reads `diseaseCountyYear.countyHotspots` filtered to one stateFips
// — the same lens that powers the national /counties leaderboard.

export interface StateCountyHotspotRow {
  fips: string
  slug: string
  countyName: string
  total: number
  diseases: number
  mostRecentYear: number
}

export interface UseStateCountyHotspotsResult {
  rows: StateCountyHotspotRow[]
  loading: boolean
  error: Error | null
}

const TOP_N = 12

export function useStateCountyHotspots(stateFips: string | null): UseStateCountyHotspotsResult {
  const initial = useSSRData<StateCountyHotspotRow[]>(
    stateFips !== null ? stateCountyHotspotsCacheKey(stateFips) : '',
  )
  const [state, setState] = useState<UseStateCountyHotspotsResult>(() =>
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

    // countyHotspots ranks counties globally and includes stateFips
    // as a hopped dim — pushdown can't filter on it. Read the top-100
    // and filter to this state client-side.
    Promise.all([
      beam.diseaseCountyYear.analyze.countyHotspots({}),
      beam.counties.query({
        where: { stateFips },
        fields: ['fips', 'slug', 'countyName'],
        limit: 500,
      }),
    ])
      .then(([analyzeRes, countiesRes]) => {
        if (cancelled) return
        const slugByFips = new Map<string, { slug: string; countyName: string }>()
        for (const c of countiesRes.rows) {
          slugByFips.set(c.fips ?? '', {
            slug: c.slug ?? '',
            countyName: c.countyName ?? '',
          })
        }
        const rows: StateCountyHotspotRow[] = analyzeRes.buckets
          .filter((b) => String(b.dims.stateFips ?? '') === stateFips)
          .map((b) => {
            const fips = String(b.dims.countyFips ?? '')
            const meta = slugByFips.get(fips)
            return {
              fips,
              slug: meta?.slug ?? '',
              countyName: meta?.countyName ?? String(b.dims.countyName ?? fips),
              total: b.measures.total ?? 0,
              diseases: b.measures.diseases ?? 0,
              mostRecentYear: b.measures.mostRecentYear ?? 0,
            }
          })
          .filter((r) => r.fips && r.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, TOP_N)
        resolvedForRef.current = stateFips
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
  }, [stateFips])

  return state
}
