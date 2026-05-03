import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { homeRecentlyEstablishedCacheKey } from './cache-keys.js'

export { homeRecentlyEstablishedCacheKey } from './cache-keys.js'

// "Newly established" ticker rows for the home page. Reads the
// `tickCounty.feed.recentlyEstablished` feed and resolves each
// item's tick + county + state to display strings.

export interface RecentlyEstablishedRow {
  countyFips: string
  countySlug: string
  countyName: string
  stateCode: string
  stateSlug: string
  tickName: string
  tickSlug: string
  year: number | null
}

export interface UseRecentlyEstablishedResult {
  rows: RecentlyEstablishedRow[]
  loading: boolean
  error: Error | null
}

const TICKER_PAGE_SIZE = 6

export function useRecentlyEstablished(): UseRecentlyEstablishedResult {
  const initial = useSSRData<RecentlyEstablishedRow[]>(homeRecentlyEstablishedCacheKey())
  const [state, setState] = useState<UseRecentlyEstablishedResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    Promise.all([
      beam.tickCounty.feed.recentlyEstablished({ pageSize: TICKER_PAGE_SIZE }),
      beam.ticks.query({ fields: ['id', 'slug', 'commonName'], limit: 100 }),
      beam.counties.query({
        fields: ['fips', 'slug', 'countyName', 'stateFips'],
        limit: 5000,
      }),
      beam.states.query({ fields: ['fips', 'slug', 'code'], limit: 60 }),
    ])
      .then(([feed, ticksRes, countiesRes, statesRes]) => {
        if (cancelled) return
        const tickById = new Map(ticksRes.rows.map((t) => [t.id, t]))
        const countyByFips = new Map(countiesRes.rows.map((c) => [c.fips ?? '', c]))
        const stateByFips = new Map(statesRes.rows.map((s) => [s.fips ?? '', s]))

        const rows: RecentlyEstablishedRow[] = feed.items
          .map((item) => {
            const md = item.metadata as {
              tickId: number
              countyFips: string | null
              year: number | null
            }
            const county = md.countyFips ? countyByFips.get(md.countyFips) : undefined
            const state = county ? stateByFips.get(county.stateFips ?? '') : undefined
            const tick = tickById.get(md.tickId)
            if (!county || !state || !tick) return null
            return {
              countyFips: md.countyFips ?? '',
              countySlug: county.slug ?? '',
              countyName: county.countyName ?? '',
              stateCode: state.code ?? '',
              stateSlug: state.slug ?? '',
              tickName: tick.commonName ?? '',
              tickSlug: tick.slug ?? '',
              year: md.year ?? null,
            }
          })
          .filter((r): r is RecentlyEstablishedRow => r !== null)

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
