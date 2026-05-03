import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { countiesLeaderboardCacheKey } from './cache-keys.js'

export { countiesLeaderboardCacheKey } from './cache-keys.js'

// /counties — top-100 counties by cumulative tick-borne disease load.
// Joins `diseaseCountyYear.countyHotspots` with `counties.query` for
// slug + stateFips, and `states.query` for the state slug + code.

export interface LeaderboardRow {
  fips: string
  slug: string
  countyName: string
  stateSlug: string
  stateCode: string
  total: number
  diseases: number
  mostRecentYear: number
}

export interface UseCountiesLeaderboardResult {
  rows: LeaderboardRow[]
  loading: boolean
  error: Error | null
}

export function useCountiesLeaderboard(): UseCountiesLeaderboardResult {
  const initial = useSSRData<LeaderboardRow[]>(countiesLeaderboardCacheKey())
  const [state, setState] = useState<UseCountiesLeaderboardResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    Promise.all([
      beam.diseaseCountyYear.analyze.countyHotspots({}),
      beam.counties.query({
        fields: ['fips', 'slug', 'countyName', 'stateFips'],
        limit: 5000,
      }),
      beam.states.query({
        fields: ['fips', 'slug', 'code'],
        limit: 60,
      }),
    ])
      .then(([hotspotsRes, countiesRes, statesRes]) => {
        if (cancelled) return
        const stateByFips = new Map<string, { slug: string; code: string }>()
        for (const s of statesRes.rows) {
          if (s.fips) stateByFips.set(s.fips, { slug: s.slug ?? '', code: s.code ?? '' })
        }
        const countyByFips = new Map<string, { slug: string; countyName: string; stateFips: string }>()
        for (const c of countiesRes.rows) {
          if (c.fips) {
            countyByFips.set(c.fips, {
              slug: c.slug ?? '',
              countyName: c.countyName ?? '',
              stateFips: c.stateFips ?? '',
            })
          }
        }
        const rows: LeaderboardRow[] = hotspotsRes.buckets
          .map((b) => {
            const fips = String(b.dims.countyFips ?? '')
            const county = countyByFips.get(fips)
            const state = county ? stateByFips.get(county.stateFips) : undefined
            return {
              fips,
              slug: county?.slug ?? '',
              countyName: county?.countyName ?? String(b.dims.countyName ?? fips),
              stateSlug: state?.slug ?? '',
              stateCode: state?.code ?? '',
              total: b.measures.total ?? 0,
              diseases: b.measures.diseases ?? 0,
              mostRecentYear: b.measures.mostRecentYear ?? 0,
            }
          })
          .filter((r) => r.fips && r.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 100)
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
  }, [initial])

  return state
}
