import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { statesIndexCacheKey } from './cache-keys.js'

export { statesIndexCacheKey } from './cache-keys.js'

// /states index — alphabetical list of every state row.

export interface StateIndexRow {
  fips: string
  code: string
  slug: string
  name: string
}

export interface UseStatesIndexResult {
  rows: StateIndexRow[]
  loading: boolean
  error: Error | null
}

export function useStatesIndex(): UseStatesIndexResult {
  const initial = useSSRData<StateIndexRow[]>(statesIndexCacheKey())
  const [state, setState] = useState<UseStatesIndexResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    beam.states
      .query({
        fields: ['fips', 'code', 'slug', 'name'],
        limit: 60,
      })
      .then((res) => {
        if (cancelled) return
        const rows: StateIndexRow[] = res.rows
          .map((r) => ({
            fips: r.fips ?? '',
            code: r.code ?? '',
            slug: r.slug ?? '',
            name: r.name ?? '',
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
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
