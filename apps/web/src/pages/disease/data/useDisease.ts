import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { diseaseCacheKey } from './cache-keys.js'

export { diseaseCacheKey } from './cache-keys.js'

// Loads a single disease by slug. Returns the row plus a discriminated
// status — 'ok' | 'not-found' | 'error' — so the caller renders the
// right state without juggling null vs undefined vs error.
//
// SSR-aware: when a prefetched row is in the SSRDataProvider under
// `disease:<slug>` the hook starts in the 'ok' state and skips the
// fetch.

export type DiseaseStatus = 'loading' | 'ok' | 'not-found' | 'error'

export interface DiseaseRow {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
  aliases: string[] | null
}

export interface UseDiseaseResult {
  disease: DiseaseRow | null
  status: DiseaseStatus
  error: Error | null
}

export function useDisease(slug: string): UseDiseaseResult {
  const initial = useSSRData<DiseaseRow>(diseaseCacheKey(slug))
  const [state, setState] = useState<UseDiseaseResult>(() =>
    initial
      ? { disease: initial, status: 'ok', error: null }
      : { disease: null, status: 'loading', error: null },
  )
  const resolvedForRef = useRef<string | null>(initial ? slug : null)

  useEffect(() => {
    if (resolvedForRef.current === slug) return

    let cancelled = false
    setState({ disease: null, status: 'loading', error: null })

    beam.diseases
      .query({
        where: { slug },
        fields: ['id', 'slug', 'displayName', 'oneLiner', 'aliases'],
        limit: 1,
      })
      .then((res) => {
        if (cancelled) return
        const row = res.rows[0] as DiseaseRow | undefined
        if (!row) {
          resolvedForRef.current = slug
          setState({ disease: null, status: 'not-found', error: null })
          return
        }
        resolvedForRef.current = slug
        setState({ disease: row, status: 'ok', error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ disease: null, status: 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return state
}
