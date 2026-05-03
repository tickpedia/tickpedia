import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { techniqueCacheKey } from './cache-keys.js'

export { techniqueCacheKey } from './cache-keys.js'

// Loads a single removal technique by slug. Returns the row plus a
// discriminated status so the caller renders the right state without
// juggling null vs undefined vs error.

export type TechniqueStatus = 'loading' | 'ok' | 'not-found' | 'error'

export interface TechniqueRow {
  id: number
  slug: string
  title: string
  oneLiner: string | null
  steps: string | null
  sourceUrl: string | null
}

export interface UseTechniqueResult {
  technique: TechniqueRow | null
  status: TechniqueStatus
  error: Error | null
}

export function useTechnique(slug: string): UseTechniqueResult {
  const initial = useSSRData<TechniqueRow>(techniqueCacheKey(slug))
  const [state, setState] = useState<UseTechniqueResult>(() =>
    initial
      ? { technique: initial, status: 'ok', error: null }
      : { technique: null, status: 'loading', error: null },
  )
  const resolvedForRef = useRef<string | null>(initial ? slug : null)

  useEffect(() => {
    if (resolvedForRef.current === slug) return

    let cancelled = false
    setState({ technique: null, status: 'loading', error: null })

    beam.removalTechniques
      .query({
        where: { slug },
        fields: ['id', 'slug', 'title', 'oneLiner', 'steps', 'sourceUrl'],
        limit: 1,
      })
      .then((res) => {
        if (cancelled) return
        const row = res.rows[0] as TechniqueRow | undefined
        if (!row) {
          resolvedForRef.current = slug
          setState({ technique: null, status: 'not-found', error: null })
          return
        }
        resolvedForRef.current = slug
        setState({ technique: row, status: 'ok', error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ technique: null, status: 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return state
}
