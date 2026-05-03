import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { techniquesIndexCacheKey } from './cache-keys.js'

export { techniquesIndexCacheKey } from './cache-keys.js'

import type { TechniqueKind } from './useTechnique.js'

// /techniques index — alphabetical list of every removal technique.

export interface TechniqueIndexRow {
  id: number
  slug: string
  title: string
  oneLiner: string | null
  kind: TechniqueKind
  preventionScore: number | null
}

export interface UseTechniquesIndexResult {
  rows: TechniqueIndexRow[]
  loading: boolean
  error: Error | null
}

export function useTechniquesIndex(): UseTechniquesIndexResult {
  const initial = useSSRData<TechniqueIndexRow[]>(techniquesIndexCacheKey())
  const [state, setState] = useState<UseTechniquesIndexResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    const ALLOWED: readonly TechniqueKind[] = [
      'removal',
      'prevention',
      'aftercare',
      'diagnostic',
      'myth',
    ]
    beam.removalTechniques
      .query({
        fields: ['id', 'slug', 'title', 'oneLiner', 'kind', 'preventionScore'],
        // 200+ entries land via the JSON content import; keep a wide
        // ceiling so the chip filter sees everything in one round-trip.
        limit: 500,
      })
      .then((res) => {
        if (cancelled) return
        const rows: TechniqueIndexRow[] = res.rows
          .map((r) => {
            const kind: TechniqueKind = (ALLOWED as readonly string[]).includes(r.kind ?? '')
              ? (r.kind as TechniqueKind)
              : 'removal'
            const score =
              kind === 'prevention' && typeof r.preventionScore === 'number'
                ? r.preventionScore
                : null
            return {
              id: r.id,
              slug: r.slug ?? '',
              title: r.title ?? '',
              oneLiner: r.oneLiner ?? null,
              kind,
              preventionScore: score,
            }
          })
          .sort((a, b) => a.title.localeCompare(b.title))
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
