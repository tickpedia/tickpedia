import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { stateCountiesCacheKey } from './cache-keys.js'

export { stateCountiesCacheKey } from './cache-keys.js'

// All counties belonging to a state. The list is small (≤ 254 for
// Texas) so we don't paginate.

export interface StateCountyRow {
  fips: string
  slug: string
  countyName: string
}

export interface UseStateCountiesResult {
  rows: StateCountyRow[]
  loading: boolean
  error: Error | null
}

export function useStateCounties(stateFips: string | null): UseStateCountiesResult {
  const initial = useSSRData<StateCountyRow[]>(
    stateFips !== null ? stateCountiesCacheKey(stateFips) : '',
  )
  const [state, setState] = useState<UseStateCountiesResult>(() =>
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

    beam.counties
      .query({
        where: { stateFips },
        fields: ['fips', 'slug', 'countyName'],
        limit: 500,
      })
      .then((res) => {
        if (cancelled) return
        const rows: StateCountyRow[] = res.rows
          .map((c) => ({
            fips: c.fips ?? '',
            slug: c.slug ?? '',
            countyName: c.countyName ?? '',
          }))
          .sort((a, b) => a.countyName.localeCompare(b.countyName))
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
