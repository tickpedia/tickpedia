import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { pathogensIndexCacheKey } from './cache-keys.js'
import { composeIndexRows, type PathogenIndexRow } from './aggregates.js'

export { pathogensIndexCacheKey } from './cache-keys.js'
export { composeIndexRows, type PathogenIndexRow } from './aggregates.js'

// /pathogens index rows. Joins three reads:
//   1. pathogens.query — full editorial list (~7 today)
//   2. tickPathogens.analyze.ticksPerPathogen — vector count badge
//   3. diseasePathogens.analyze.diseasesPerPathogen — disease count badge

export interface UsePathogensIndexResult {
  rows: PathogenIndexRow[]
  loading: boolean
  error: Error | null
}

export function usePathogensIndex(): UsePathogensIndexResult {
  const initial = useSSRData<PathogenIndexRow[]>(pathogensIndexCacheKey())
  const [state, setState] = useState<UsePathogensIndexResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedRef = useRef<boolean>(initial !== undefined)

  useEffect(() => {
    if (resolvedRef.current) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    Promise.all([
      beam.pathogens.query({
        fields: ['id', 'slug', 'displayName', 'scientificName', 'oneLiner'],
        limit: 100,
      }),
      beam.tickPathogens.analyze.ticksPerPathogen({}),
      beam.diseasePathogens.analyze.diseasesPerPathogen({}),
    ])
      .then(([pathogensRes, ticksRes, diseasesRes]) => {
        if (cancelled) return
        const rows = composeIndexRows(
          pathogensRes.rows,
          ticksRes.buckets,
          diseasesRes.buckets,
        )
        resolvedRef.current = true
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
  }, [])

  return state
}
