import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { stateCacheKey } from './cache-keys.js'

export { stateCacheKey } from './cache-keys.js'

// Loads a single state row by slug. Hook is named `useStateRow` to
// avoid shadowing React's `useState`.

export type StateStatus = 'loading' | 'ok' | 'not-found' | 'error'

export interface StateRow {
  fips: string
  code: string
  slug: string
  name: string
}

export interface UseStateRowResult {
  state: StateRow | null
  status: StateStatus
  error: Error | null
}

export function useStateRow(slug: string): UseStateRowResult {
  const initial = useSSRData<StateRow>(stateCacheKey(slug))
  const [state, setState] = useState<UseStateRowResult>(() =>
    initial
      ? { state: initial, status: 'ok', error: null }
      : { state: null, status: 'loading', error: null },
  )
  const resolvedForRef = useRef<string | null>(initial ? slug : null)

  useEffect(() => {
    if (resolvedForRef.current === slug) return

    let cancelled = false
    setState({ state: null, status: 'loading', error: null })

    beam.states
      .query({
        where: { slug },
        fields: ['fips', 'code', 'slug', 'name'],
        limit: 1,
      })
      .then((res) => {
        if (cancelled) return
        const row = res.rows[0] as StateRow | undefined
        if (!row) {
          resolvedForRef.current = slug
          setState({ state: null, status: 'not-found', error: null })
          return
        }
        resolvedForRef.current = slug
        setState({ state: row, status: 'ok', error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ state: null, status: 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return state
}
