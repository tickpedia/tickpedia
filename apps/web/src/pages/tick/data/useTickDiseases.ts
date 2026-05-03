import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { tickDiseasesCacheKey } from './cache-keys.js'

export { tickDiseasesCacheKey } from './cache-keys.js'

// Loads "diseases this tick carries". Joins two reads:
//   1. tickDiseases.query({where: {tickId}}) → list of diseaseIds
//   2. diseases.query({fields: [id, slug, displayName, oneLiner]}) →
//      metadata for every disease (small table, fetch once)
//
// SSR-aware: when the SSRDataProvider has `tickDiseases:<id>` the
// hook returns the prefetched rows synchronously and skips the
// network round-trip.

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
  const initial = useSSRData<TickDiseaseRow[]>(
    tickId !== null ? tickDiseasesCacheKey(tickId) : '',
  )
  const [state, setState] = useState<UseTickDiseasesResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(initial && tickId !== null ? tickId : null)

  useEffect(() => {
    if (tickId === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    if (resolvedForRef.current === tickId) return

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
        resolvedForRef.current = tickId
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
