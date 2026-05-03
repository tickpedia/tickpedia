import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { diseaseTicksCacheKey } from './cache-keys.js'

export { diseaseTicksCacheKey } from './cache-keys.js'

// "Ticks that carry this disease". Mirror of pages/tick/data/useTickDiseases.ts:
//   1. tickDiseases.query({where: {diseaseId}}) → list of tickIds
//   2. ticks.query({fields: [id, slug, commonName, scientificName, oneLiner]})
//      → metadata for every tick (small table, fetch once)

export interface DiseaseTickRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
}

export interface UseDiseaseTicksResult {
  rows: DiseaseTickRow[]
  loading: boolean
  error: Error | null
}

export function useDiseaseTicks(diseaseId: number | null): UseDiseaseTicksResult {
  const initial = useSSRData<DiseaseTickRow[]>(
    diseaseId !== null ? diseaseTicksCacheKey(diseaseId) : '',
  )
  const [state, setState] = useState<UseDiseaseTicksResult>(() =>
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
      beam.tickDiseases.query({
        where: { diseaseId },
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
        const rows: DiseaseTickRow[] = ticksRes.rows
          .filter((t) => ids.has(t.id))
          .map((t) => ({
            id: t.id,
            slug: t.slug ?? '',
            commonName: t.commonName ?? '',
            scientificName: t.scientificName ?? '',
            oneLiner: t.oneLiner ?? null,
          }))
          .sort((a, b) => a.commonName.localeCompare(b.commonName))
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
