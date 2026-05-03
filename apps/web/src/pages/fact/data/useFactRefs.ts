import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { factRefsCacheKey } from './cache-keys.js'

export { factRefsCacheKey } from './cache-keys.js'

// "What does this fact reference?" — the three editorial join lenses
// (wildFactTicks / wildFactDiseases / wildFactRemovalTechniques)
// resolved to entity rows for chip rendering. Empty groups hide
// in the UI but are still represented as empty arrays here so the
// page can render a "no refs yet" state without three null checks.

export interface FactTickRef {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
}

export interface FactDiseaseRef {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
}

export interface FactTechniqueRef {
  id: number
  slug: string
  title: string
  oneLiner: string | null
}

export interface FactRefs {
  ticks: FactTickRef[]
  diseases: FactDiseaseRef[]
  techniques: FactTechniqueRef[]
}

export interface UseFactRefsResult extends FactRefs {
  loading: boolean
  error: Error | null
}

const EMPTY_REFS: FactRefs = { ticks: [], diseases: [], techniques: [] }

export function useFactRefs(factId: number | null): UseFactRefsResult {
  const initial = useSSRData<FactRefs>(factId !== null ? factRefsCacheKey(factId) : '')
  const [state, setState] = useState<UseFactRefsResult>(() =>
    initial
      ? { ...initial, loading: false, error: null }
      : { ...EMPTY_REFS, loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(initial && factId !== null ? factId : null)

  useEffect(() => {
    if (factId === null) {
      resolvedForRef.current = null
      setState({ ...EMPTY_REFS, loading: true, error: null })
      return
    }
    if (resolvedForRef.current === factId) return

    let cancelled = false
    setState({ ...EMPTY_REFS, loading: true, error: null })

    Promise.all([
      beam.wildFactTicks.query({
        where: { wildFactId: factId },
        fields: ['tickId'],
        limit: 50,
      }),
      beam.wildFactDiseases.query({
        where: { wildFactId: factId },
        fields: ['diseaseId'],
        limit: 50,
      }),
      beam.wildFactRemovalTechniques.query({
        where: { wildFactId: factId },
        fields: ['removalTechniqueId'],
        limit: 50,
      }),
      beam.ticks.query({
        fields: ['id', 'slug', 'commonName', 'scientificName', 'oneLiner'],
        limit: 100,
      }),
      beam.diseases.query({
        fields: ['id', 'slug', 'displayName', 'oneLiner'],
        limit: 100,
      }),
      beam.removalTechniques.query({
        fields: ['id', 'slug', 'title', 'oneLiner'],
        limit: 50,
      }),
    ])
      .then(([tickJoin, diseaseJoin, techniqueJoin, ticks, diseases, techniques]) => {
        if (cancelled) return
        const tickIds = new Set(tickJoin.rows.map((r) => r.tickId))
        const diseaseIds = new Set(diseaseJoin.rows.map((r) => r.diseaseId))
        const techniqueIds = new Set(techniqueJoin.rows.map((r) => r.removalTechniqueId))

        const refs: FactRefs = {
          ticks: ticks.rows
            .filter((t) => tickIds.has(t.id))
            .map((t) => ({
              id: t.id,
              slug: t.slug ?? '',
              commonName: t.commonName ?? '',
              scientificName: t.scientificName ?? '',
              oneLiner: t.oneLiner ?? null,
            }))
            .sort((a, b) => a.commonName.localeCompare(b.commonName)),
          diseases: diseases.rows
            .filter((d) => diseaseIds.has(d.id))
            .map((d) => ({
              id: d.id,
              slug: d.slug ?? '',
              displayName: d.displayName ?? '',
              oneLiner: d.oneLiner ?? null,
            }))
            .sort((a, b) => a.displayName.localeCompare(b.displayName)),
          techniques: techniques.rows
            .filter((tq) => techniqueIds.has(tq.id))
            .map((tq) => ({
              id: tq.id,
              slug: tq.slug ?? '',
              title: tq.title ?? '',
              oneLiner: tq.oneLiner ?? null,
            }))
            .sort((a, b) => a.title.localeCompare(b.title)),
        }

        resolvedForRef.current = factId
        setState({ ...refs, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ ...EMPTY_REFS, loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [factId])

  return state
}
