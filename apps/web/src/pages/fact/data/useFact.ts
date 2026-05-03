import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { factCacheKey } from './cache-keys.js'

export { factCacheKey } from './cache-keys.js'

// Loads a single wild fact by slug. Mirrors useTechnique / useTick
// shape — discriminated status so the caller renders the right state
// without juggling null vs undefined vs error.

export type FactStatus = 'loading' | 'ok' | 'not-found' | 'error'

export interface FactRow {
  id: number
  slug: string
  body: string
  citationUrl: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface UseFactResult {
  fact: FactRow | null
  status: FactStatus
  error: Error | null
}

export function useFact(slug: string): UseFactResult {
  const initial = useSSRData<FactRow>(factCacheKey(slug))
  const [state, setState] = useState<UseFactResult>(() =>
    initial
      ? { fact: initial, status: 'ok', error: null }
      : { fact: null, status: 'loading', error: null },
  )
  const resolvedForRef = useRef<string | null>(initial ? slug : null)

  useEffect(() => {
    if (resolvedForRef.current === slug) return

    let cancelled = false
    setState({ fact: null, status: 'loading', error: null })

    beam.wildFacts
      .query({
        where: { slug },
        fields: ['id', 'slug', 'body', 'citationUrl', 'createdAt', 'updatedAt'],
        limit: 1,
      })
      .then((res) => {
        if (cancelled) return
        const row = res.rows[0] as
          | {
              id: number
              slug: string | null
              body: string | null
              citationUrl: string | null
              createdAt: string | null
              updatedAt: string | null
            }
          | undefined
        if (!row) {
          resolvedForRef.current = slug
          setState({ fact: null, status: 'not-found', error: null })
          return
        }
        const fact: FactRow = {
          id: row.id,
          slug: row.slug ?? '',
          body: row.body ?? '',
          citationUrl: row.citationUrl ?? null,
          createdAt: row.createdAt ?? null,
          updatedAt: row.updatedAt ?? null,
        }
        resolvedForRef.current = slug
        setState({ fact, status: 'ok', error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ fact: null, status: 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return state
}
