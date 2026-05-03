import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { pathogenTicksCacheKey } from './cache-keys.js'

export { pathogenTicksCacheKey } from './cache-keys.js'

// "Ticks that carry this pathogen". Mirrors useDiseaseTicks: a join
// query on tickPathogens then a single ticks fetch by id.

export interface PathogenTickRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
}

export interface UsePathogenTicksResult {
  rows: PathogenTickRow[]
  loading: boolean
  error: Error | null
}

export function usePathogenTicks(pathogenId: number | null): UsePathogenTicksResult {
  const initial = useSSRData<PathogenTickRow[]>(
    pathogenId !== null ? pathogenTicksCacheKey(pathogenId) : '',
  )
  const [state, setState] = useState<UsePathogenTicksResult>(() =>
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
      beam.tickPathogens.query({
        where: { pathogenId },
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
        const rows: PathogenTickRow[] = ticksRes.rows
          .filter((t) => ids.has(t.id))
          .map((t) => ({
            id: t.id,
            slug: t.slug ?? '',
            commonName: t.commonName ?? '',
            scientificName: t.scientificName ?? '',
            oneLiner: t.oneLiner ?? null,
          }))
          .sort((a, b) => a.commonName.localeCompare(b.commonName))
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
