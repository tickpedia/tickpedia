import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { techniqueCacheKey } from './cache-keys.js'
import {
  normalizeTechnique,
  type TechniqueKind,
  type TechniqueRow,
} from './normalize.js'

export { techniqueCacheKey } from './cache-keys.js'
export {
  normalizeTechnique,
  type TechniqueKind,
  type TechniqueRow,
} from './normalize.js'

// Loads a single removal technique by slug. Returns the row plus a
// discriminated status so the caller renders the right state without
// juggling null vs undefined vs error.

export type TechniqueStatus = 'loading' | 'ok' | 'not-found' | 'error'

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
        fields: [
          'id',
          'slug',
          'title',
          'oneLiner',
          'steps',
          'sourceUrl',
          'kind',
          'preventionScore',
          'citations',
        ],
        limit: 1,
      })
      .then((res) => {
        if (cancelled) return
        const raw = res.rows[0]
        if (!raw) {
          resolvedForRef.current = slug
          setState({ technique: null, status: 'not-found', error: null })
          return
        }
        const row = normalizeTechnique(raw as Record<string, unknown>)
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
