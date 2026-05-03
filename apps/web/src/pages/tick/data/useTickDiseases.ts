import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'

// Loads "diseases this tick carries". Joins three reads:
//   1. tickDiseases.query({where: {tickId}}) → list of diseaseIds
//   2. diseases.query({fields: [id, slug, displayName, oneLiner]}) →
//      metadata for every disease (small table, fetch once)
//   3. tickCounty.analyze.establishedRange? — not needed here
//
// Returns a row per disease the tick carries, joined to its
// metadata. Caller renders the table.

export interface TickDiseaseRow {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
}

export interface UseTickDiseasesResult {
  rows: TickDiseaseRow[]
  loading: boolean
  error: Error | null
}

export function useTickDiseases(tickId: number | null): UseTickDiseasesResult {
  const [state, setState] = useState<UseTickDiseasesResult>({
    rows: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (tickId === null) {
      setState({ rows: [], loading: true, error: null })
      return
    }
    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    Promise.all([
      beam.tickDiseases.query({
        where: { tickId },
        fields: ['diseaseId'],
        limit: 50,
      }),
      beam.diseases.query({
        fields: ['id', 'slug', 'displayName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([joinRes, diseasesRes]) => {
        if (cancelled) return
        const ids = new Set(joinRes.rows.map((r) => r.diseaseId))
        const rows: TickDiseaseRow[] = diseasesRes.rows
          .filter((d) => ids.has(d.id))
          .map((d) => ({
            id: d.id,
            slug: d.slug ?? '',
            displayName: d.displayName ?? '',
            oneLiner: d.oneLiner ?? null,
          }))
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
  }, [tickId])

  return state
}
