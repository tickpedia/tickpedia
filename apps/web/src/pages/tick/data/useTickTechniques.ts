import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { tickTechniquesCacheKey } from './cache-keys.js'
import type { TechniqueKind } from '../../technique/data/useTechnique.js'

export { tickTechniquesCacheKey } from './cache-keys.js'

// Loads the removal / prevention / aftercare entries the editorial
// team has linked to this tick. Two SemiLayer reads, joined locally:
//   1. tickRemovalTechniques.query({ where: { tickId }}) → ids
//   2. removalTechniques.query({ ids[] }) → metadata for those entries
//
// The joined output is split into kind buckets so the section can
// render three rails (remove → prevent → aftercare) without each card
// re-deciding which bucket it lives in.

export interface TickTechniqueRow {
  id: number
  slug: string
  title: string
  oneLiner: string | null
  kind: TechniqueKind
  preventionScore: number | null
  citations: string[]
  sourceUrl: string | null
}

export interface TickTechniqueBuckets {
  removal: TickTechniqueRow[]
  prevention: TickTechniqueRow[]
  aftercare: TickTechniqueRow[]
  diagnostic: TickTechniqueRow[]
  myth: TickTechniqueRow[]
}

export interface UseTickTechniquesResult {
  buckets: TickTechniqueBuckets
  total: number
  loading: boolean
  error: Error | null
}

const ALLOWED: readonly TechniqueKind[] = [
  'removal',
  'prevention',
  'aftercare',
  'diagnostic',
  'myth',
]

const empty = (): TickTechniqueBuckets => ({
  removal: [],
  prevention: [],
  aftercare: [],
  diagnostic: [],
  myth: [],
})

function bucketize(rows: TickTechniqueRow[]): TickTechniqueBuckets {
  const out = empty()
  for (const r of rows) out[r.kind].push(r)
  // Prevention rail sorts by score desc so high-impact moves bubble up.
  out.prevention.sort(
    (a, b) =>
      (b.preventionScore ?? -1) - (a.preventionScore ?? -1) ||
      a.title.localeCompare(b.title),
  )
  for (const k of ['removal', 'aftercare', 'diagnostic', 'myth'] as const) {
    out[k].sort((a, b) => a.title.localeCompare(b.title))
  }
  return out
}

export function useTickTechniques(tickId: number | null): UseTickTechniquesResult {
  const initial = useSSRData<TickTechniqueRow[]>(
    tickId !== null ? tickTechniquesCacheKey(tickId) : '',
  )
  const [state, setState] = useState<UseTickTechniquesResult>(() =>
    initial
      ? { buckets: bucketize(initial), total: initial.length, loading: false, error: null }
      : { buckets: empty(), total: 0, loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(initial && tickId !== null ? tickId : null)

  useEffect(() => {
    if (tickId === null) {
      resolvedForRef.current = null
      setState({ buckets: empty(), total: 0, loading: true, error: null })
      return
    }
    if (resolvedForRef.current === tickId) return

    let cancelled = false
    setState({ buckets: empty(), total: 0, loading: true, error: null })

    beam.tickRemovalTechniques
      .query({
        where: { tickId },
        fields: ['removalTechniqueId'],
        limit: 200,
      })
      .then(async (joinRes) => {
        const ids = joinRes.rows
          .map((r) => r.removalTechniqueId)
          .filter((n): n is number => typeof n === 'number')
        if (ids.length === 0) {
          if (!cancelled) {
            resolvedForRef.current = tickId
            setState({ buckets: empty(), total: 0, loading: false, error: null })
          }
          return
        }
        const techRes = await beam.removalTechniques.query({
          where: { id: { $in: ids } },
          fields: [
            'id',
            'slug',
            'title',
            'oneLiner',
            'kind',
            'preventionScore',
            'citations',
            'sourceUrl',
          ],
          limit: 200,
        })
        if (cancelled) return
        const rows: TickTechniqueRow[] = techRes.rows.map((r) => {
          const m = r as Record<string, unknown>
          const kindRaw = typeof m.kind === 'string' ? m.kind : 'removal'
          const kind = (ALLOWED as readonly string[]).includes(kindRaw)
            ? (kindRaw as TechniqueKind)
            : 'removal'
          const score =
            kind === 'prevention' && typeof m.preventionScore === 'number'
              ? m.preventionScore
              : null
          const citations = Array.isArray(m.citations)
            ? (m.citations as unknown[]).filter(
                (c): c is string => typeof c === 'string' && c.length > 0,
              )
            : []
          return {
            id: typeof m.id === 'number' ? m.id : 0,
            slug: typeof m.slug === 'string' ? m.slug : '',
            title: typeof m.title === 'string' ? m.title : '',
            oneLiner: typeof m.oneLiner === 'string' ? m.oneLiner : null,
            kind,
            preventionScore: score,
            citations,
            sourceUrl: typeof m.sourceUrl === 'string' ? m.sourceUrl : null,
          }
        })
        resolvedForRef.current = tickId
        setState({
          buckets: bucketize(rows),
          total: rows.length,
          loading: false,
          error: null,
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ buckets: empty(), total: 0, loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [tickId])

  return state
}
