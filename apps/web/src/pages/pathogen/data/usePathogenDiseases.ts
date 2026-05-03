import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { pathogenDiseasesCacheKey } from './cache-keys.js'

export { pathogenDiseasesCacheKey } from './cache-keys.js'

// "Diseases this pathogen causes". Mirrors useDiseasePathogens with the
// roles flipped: diseasePathogens.query({where: {pathogenId}}) →
// diseaseId list, then diseases.query for metadata.

export interface PathogenDiseaseRow {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
}

export interface UsePathogenDiseasesResult {
  rows: PathogenDiseaseRow[]
  loading: boolean
  error: Error | null
}

export function usePathogenDiseases(pathogenId: number | null): UsePathogenDiseasesResult {
  const initial = useSSRData<PathogenDiseaseRow[]>(
    pathogenId !== null ? pathogenDiseasesCacheKey(pathogenId) : '',
  )
  const [state, setState] = useState<UsePathogenDiseasesResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(initial && pathogenId !== null ? pathogenId : null)

  useEffect(() => {
    if (pathogenId === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    if (resolvedForRef.current === pathogenId) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    Promise.all([
      beam.diseasePathogens.query({
        where: { pathogenId },
        fields: ['diseaseId'],
        limit: 20,
      }),
      beam.diseases.query({
        fields: ['id', 'slug', 'displayName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([joinRes, diseasesRes]) => {
        if (cancelled) return
        const ids = new Set(joinRes.rows.map((r) => r.diseaseId))
        const rows: PathogenDiseaseRow[] = diseasesRes.rows
          .filter((d) => ids.has(d.id))
          .map((d) => ({
            id: d.id,
            slug: d.slug ?? '',
            displayName: d.displayName ?? '',
            oneLiner: d.oneLiner ?? null,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
        resolvedForRef.current = pathogenId
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
  }, [pathogenId])

  return state
}
