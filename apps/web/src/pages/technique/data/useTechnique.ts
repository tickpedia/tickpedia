import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { techniqueCacheKey } from './cache-keys.js'

export { techniqueCacheKey } from './cache-keys.js'

// Loads a single removal technique by slug. Returns the row plus a
// discriminated status so the caller renders the right state without
// juggling null vs undefined vs error.

export type TechniqueStatus = 'loading' | 'ok' | 'not-found' | 'error'

export type TechniqueKind = 'removal' | 'prevention' | 'aftercare' | 'diagnostic' | 'myth'

export interface TechniqueRow {
  id: number
  slug: string
  title: string
  oneLiner: string | null
  steps: string | null
  sourceUrl: string | null
  kind: TechniqueKind
  /** 0-10 — only meaningful when kind = 'prevention'. */
  preventionScore: number | null
  citations: string[]
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
        const row = normalizeTechnique(raw)
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

const ALLOWED_KINDS: readonly TechniqueKind[] = [
  'removal',
  'prevention',
  'aftercare',
  'diagnostic',
  'myth',
]

// SemiLayer's generated metadata types declare `citations` as a single
// string and `preventionScore` as a non-nullable number, but the wire
// format honours the underlying Postgres `text[]` / nullable integer.
// Normalize here so the rest of the page can lean on a typed shape.
export function normalizeTechnique(raw: Record<string, unknown>): TechniqueRow {
  const kindRaw = typeof raw.kind === 'string' ? raw.kind : 'removal'
  const kind = (ALLOWED_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as TechniqueKind)
    : 'removal'
  const preventionScoreRaw = raw.preventionScore
  const preventionScore =
    kind === 'prevention' &&
    typeof preventionScoreRaw === 'number' &&
    Number.isFinite(preventionScoreRaw)
      ? Math.max(0, Math.min(10, Math.round(preventionScoreRaw)))
      : null
  const citationsRaw = raw.citations
  const citations: string[] = Array.isArray(citationsRaw)
    ? citationsRaw.filter((c): c is string => typeof c === 'string' && c.length > 0)
    : typeof citationsRaw === 'string' && citationsRaw.length > 0
      ? [citationsRaw]
      : []
  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    slug: typeof raw.slug === 'string' ? raw.slug : '',
    title: typeof raw.title === 'string' ? raw.title : '',
    oneLiner: typeof raw.oneLiner === 'string' ? raw.oneLiner : null,
    steps: typeof raw.steps === 'string' ? raw.steps : null,
    sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl : null,
    kind,
    preventionScore,
    citations,
  }
}
