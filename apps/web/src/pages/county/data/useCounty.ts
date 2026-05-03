import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { countyCacheKey } from './cache-keys.js'

export { countyCacheKey } from './cache-keys.js'

// Loads a single county row by composite key (state-slug + county-slug).
// County slugs aren't unique nationally — Lincoln County exists in 18
// states — so we resolve the parent state's fips first, then query
// counties with both keys.

export type CountyStatus = 'loading' | 'ok' | 'not-found' | 'error'

export interface CountyRow {
  fips: string
  slug: string
  stateFips: string
  countyName: string
  latitude: number | null
  longitude: number | null
}

export interface ParentState {
  fips: string
  slug: string
  name: string
  code: string
}

export interface UseCountyResult {
  county: CountyRow | null
  parentState: ParentState | null
  status: CountyStatus
  error: Error | null
}

export function useCounty(stateSlug: string, countySlug: string): UseCountyResult {
  const initial = useSSRData<{ county: CountyRow; parentState: ParentState }>(
    countyCacheKey(stateSlug, countySlug),
  )
  const [state, setState] = useState<UseCountyResult>(() =>
    initial
      ? { county: initial.county, parentState: initial.parentState, status: 'ok', error: null }
      : { county: null, parentState: null, status: 'loading', error: null },
  )
  const resolvedForRef = useRef<string | null>(initial ? `${stateSlug}/${countySlug}` : null)

  useEffect(() => {
    const signature = `${stateSlug}/${countySlug}`
    if (resolvedForRef.current === signature) return

    let cancelled = false
    setState({ county: null, parentState: null, status: 'loading', error: null })

    beam.states
      .query({
        where: { slug: stateSlug },
        fields: ['fips', 'slug', 'name', 'code'],
        limit: 1,
      })
      .then(async (statesRes) => {
        if (cancelled) return
        const parentState = statesRes.rows[0] as ParentState | undefined
        if (!parentState) {
          resolvedForRef.current = signature
          setState({ county: null, parentState: null, status: 'not-found', error: null })
          return
        }

        const countiesRes = await beam.counties.query({
          where: { slug: countySlug, stateFips: parentState.fips },
          fields: ['fips', 'slug', 'stateFips', 'countyName', 'latitude', 'longitude'],
          limit: 1,
        })
        if (cancelled) return
        const countyRaw = countiesRes.rows[0]
        if (!countyRaw) {
          resolvedForRef.current = signature
          setState({ county: null, parentState, status: 'not-found', error: null })
          return
        }
        const county: CountyRow = {
          fips: countyRaw.fips ?? '',
          slug: countyRaw.slug ?? '',
          stateFips: countyRaw.stateFips ?? '',
          countyName: countyRaw.countyName ?? '',
          latitude: countyRaw.latitude ?? null,
          longitude: countyRaw.longitude ?? null,
        }
        resolvedForRef.current = signature
        setState({ county, parentState, status: 'ok', error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ county: null, parentState: null, status: 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [stateSlug, countySlug])

  return state
}
