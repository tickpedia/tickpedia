import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { techniqueTicksCacheKey } from './cache-keys.js'

export { techniqueTicksCacheKey } from './cache-keys.js'

// "Ticks this technique applies to". The editorial join lens
// (`tick_removal_techniques`) may be empty until the seed catches
// up — the page renders an editorial-empty fallback in that case.

export interface TechniqueTickRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
}

export interface UseTechniqueTicksResult {
  rows: TechniqueTickRow[]
  loading: boolean
  error: Error | null
}

export function useTechniqueTicks(techniqueId: number | null): UseTechniqueTicksResult {
  const initial = useSSRData<TechniqueTickRow[]>(
    techniqueId !== null ? techniqueTicksCacheKey(techniqueId) : '',
  )
  const [state, setState] = useState<UseTechniqueTicksResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(
    initial && techniqueId !== null ? techniqueId : null,
  )

  useEffect(() => {
    if (techniqueId === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    if (resolvedForRef.current === techniqueId) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    Promise.all([
      beam.tickRemovalTechniques.query({
        where: { removalTechniqueId: techniqueId },
        fields: ['tickId'],
        limit: 50,
      }),
      beam.ticks.query({
        fields: ['id', 'slug', 'commonName', 'scientificName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([joinRes, ticksRes]) => {
        if (cancelled) return
        const ids = new Set(joinRes.rows.map((r) => r.tickId))
        const rows: TechniqueTickRow[] = ticksRes.rows
          .filter((t) => ids.has(t.id))
          .map((t) => ({
            id: t.id,
            slug: t.slug ?? '',
            commonName: t.commonName ?? '',
            scientificName: t.scientificName ?? '',
            oneLiner: t.oneLiner ?? null,
          }))
          .sort((a, b) => a.commonName.localeCompare(b.commonName))
        resolvedForRef.current = techniqueId
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
  }, [techniqueId])

  return state
}
