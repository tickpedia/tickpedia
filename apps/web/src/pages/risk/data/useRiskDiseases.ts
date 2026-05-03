import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { riskDiseasesCacheKey } from './cache-keys.js'

export { riskDiseasesCacheKey } from './cache-keys.js'

// Disease catalog for the /risk + /risk/[slug] filter chip rail.
// Pulls every disease (limit 50; the seed has 21). Sorted alphabetically
// by displayName so the chip rail reads as a stable list.

export interface RiskDiseaseRow {
  id: number
  slug: string
  displayName: string
}

export interface UseRiskDiseasesResult {
  rows: RiskDiseaseRow[]
  loading: boolean
  error: Error | null
}

export function useRiskDiseases(): UseRiskDiseasesResult {
  const initial = useSSRData<RiskDiseaseRow[]>(riskDiseasesCacheKey())
  const [state, setState] = useState<UseRiskDiseasesResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    beam.diseases
      .query({ fields: ['id', 'slug', 'displayName'], limit: 50 })
      .then((res) => {
        if (cancelled) return
        const rows: RiskDiseaseRow[] = res.rows
          .map((r) => ({
            id: r.id,
            slug: r.slug ?? '',
            displayName: r.displayName ?? '',
          }))
          .filter((r) => r.slug)
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
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
