import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { pathogenCacheKey } from './cache-keys.js'
import { normalizePathogen, type PathogenRow } from './normalize.js'

export { pathogenCacheKey } from './cache-keys.js'
export { normalizePathogen, type PathogenRow } from './normalize.js'

// Loads a single pathogen by slug. Discriminated status mirrors
// `useDisease` so the caller renders the right state without juggling
// null vs undefined vs error.

export type PathogenStatus = 'loading' | 'ok' | 'not-found' | 'error'

export interface UsePathogenResult {
  pathogen: PathogenRow | null
  status: PathogenStatus
  error: Error | null
}

export function usePathogen(slug: string): UsePathogenResult {
  const initial = useSSRData<PathogenRow>(pathogenCacheKey(slug))
  const [state, setState] = useState<UsePathogenResult>(() =>
    initial
      ? { pathogen: initial, status: 'ok', error: null }
      : { pathogen: null, status: 'loading', error: null },
  )
  const resolvedForRef = useRef<string | null>(initial ? slug : null)

  useEffect(() => {
    if (resolvedForRef.current === slug) return

    let cancelled = false
    setState({ pathogen: null, status: 'loading', error: null })

    beam.pathogens
      .query({
        where: { slug },
        fields: ['id', 'slug', 'displayName', 'scientificName', 'oneLiner', 'aliases'],
        limit: 1,
      })
      .then((res) => {
        if (cancelled) return
        const raw = res.rows[0]
        if (!raw) {
          resolvedForRef.current = slug
          setState({ pathogen: null, status: 'not-found', error: null })
          return
        }
        const row = normalizePathogen(raw as Record<string, unknown>)
        resolvedForRef.current = slug
        setState({ pathogen: row, status: 'ok', error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ pathogen: null, status: 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return state
}
