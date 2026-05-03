import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { diseasePathogensCacheKey } from './cache-keys.js'

export { diseasePathogensCacheKey } from './cache-keys.js'

// "Pathogens that cause this disease". Same join shape as
// useDiseaseTicks — diseasePathogens lookup, then a single pathogens
// fetch by id.
//
// Pathogen pages (5b) are deferrable; until they ship, the alias map
// + the SPA fallback handle /pathogens/[slug] requests.

export interface DiseasePathogenRow {
  id: number
  slug: string
  displayName: string
  scientificName: string
  oneLiner: string | null
}

export interface UseDiseasePathogensResult {
  rows: DiseasePathogenRow[]
  loading: boolean
  error: Error | null
}

export function useDiseasePathogens(diseaseId: number | null): UseDiseasePathogensResult {
  const initial = useSSRData<DiseasePathogenRow[]>(
    diseaseId !== null ? diseasePathogensCacheKey(diseaseId) : '',
  )
  const [state, setState] = useState<UseDiseasePathogensResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(initial && diseaseId !== null ? diseaseId : null)

  useEffect(() => {
    if (diseaseId === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    if (resolvedForRef.current === diseaseId) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    Promise.all([
      beam.diseasePathogens.query({
        where: { diseaseId },
        fields: ['pathogenId'],
        limit: 20,
      }),
      beam.pathogens.query({
        fields: ['id', 'slug', 'displayName', 'scientificName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([joinRes, pathogensRes]) => {
        if (cancelled) return
        const ids = new Set(joinRes.rows.map((r) => r.pathogenId))
        const rows: DiseasePathogenRow[] = pathogensRes.rows
          .filter((p) => ids.has(p.id))
          .map((p) => ({
            id: p.id,
            slug: p.slug ?? '',
            displayName: p.displayName ?? '',
            scientificName: p.scientificName ?? '',
            oneLiner: p.oneLiner ?? null,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
        resolvedForRef.current = diseaseId
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
  }, [diseaseId])

  return state
}
