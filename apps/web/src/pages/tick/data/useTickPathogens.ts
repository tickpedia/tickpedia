import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { tickPathogensCacheKey } from './cache-keys.js'

export { tickPathogensCacheKey } from './cache-keys.js'

// "Pathogens this tick carries". Same join shape as useTickDiseases:
// tickPathogens.query(tickId) → pathogenIds, then a single pathogens
// fetch by id. Drives the Pathogens chip + section retro-fit on
// /ticks/[slug] when phase 5b ships.

export interface TickPathogenRow {
  id: number
  slug: string
  displayName: string
  scientificName: string
  oneLiner: string | null
}

export interface UseTickPathogensResult {
  rows: TickPathogenRow[]
  loading: boolean
  error: Error | null
}

export function useTickPathogens(tickId: number | null): UseTickPathogensResult {
  const initial = useSSRData<TickPathogenRow[]>(
    tickId !== null ? tickPathogensCacheKey(tickId) : '',
  )
  const [state, setState] = useState<UseTickPathogensResult>(() =>
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
      beam.tickPathogens.query({
        where: { tickId },
        fields: ['pathogenId'],
        limit: 50,
      }),
      beam.pathogens.query({
        fields: ['id', 'slug', 'displayName', 'scientificName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([joinRes, pathogensRes]) => {
        if (cancelled) return
        const ids = new Set(joinRes.rows.map((r) => r.pathogenId))
        const rows: TickPathogenRow[] = pathogensRes.rows
          .filter((p) => ids.has(p.id))
          .map((p) => ({
            id: p.id,
            slug: p.slug ?? '',
            displayName: p.displayName ?? '',
            scientificName: p.scientificName ?? '',
            oneLiner: p.oneLiner ?? null,
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
