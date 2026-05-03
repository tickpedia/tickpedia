import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { riskDiseasePageCacheKey } from './cache-keys.js'

export { riskDiseasePageCacheKey } from './cache-keys.js'

// Resolves /risk/[disease-slug] to a DiseaseRow. Mirrors useDisease
// but without the extra fields the disease page needs (no `aliases`,
// no full description) — keeps the cache entry small and the wire
// payload tight.

export type RiskDiseaseStatus = 'loading' | 'ok' | 'not-found' | 'error'

export interface RiskDiseaseRow {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
}

export interface UseRiskDiseaseResult {
  disease: RiskDiseaseRow | null
  status: RiskDiseaseStatus
  error: Error | null
}

export function useRiskDisease(slug: string): UseRiskDiseaseResult {
  const initial = useSSRData<RiskDiseaseRow>(riskDiseasePageCacheKey(slug))
  const [state, setState] = useState<UseRiskDiseaseResult>(() =>
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
        fields: ['id', 'slug', 'displayName', 'oneLiner'],
        limit: 1,
      })
      .then((res) => {
        if (cancelled) return
        const row = res.rows[0] as
          | { id: number; slug: string | null; displayName: string | null; oneLiner: string | null }
          | undefined
        if (!row) {
          resolvedForRef.current = slug
          setState({ disease: null, status: 'not-found', error: null })
          return
        }
        resolvedForRef.current = slug
        setState({
          disease: {
            id: row.id,
            slug: row.slug ?? '',
            displayName: row.displayName ?? '',
            oneLiner: row.oneLiner ?? null,
          },
          status: 'ok',
          error: null,
        })
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
