import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { stateDiseasesCacheKey } from './cache-keys.js'

export { stateDiseasesCacheKey } from './cache-keys.js'

// Cumulative disease totals for a state. Reads
// `diseaseCountyYear.casesByState` filtered to one stateFips, then
// joins to `diseases.query` for the display name + slug + oneLiner.

export interface StateDiseaseRow {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
  total: number
  counties: number
  yearsCovered: number
}

export interface UseStateDiseasesResult {
  rows: StateDiseaseRow[]
  loading: boolean
  error: Error | null
}

export function useStateDiseases(stateFips: string | null): UseStateDiseasesResult {
  const initial = useSSRData<StateDiseaseRow[]>(
    stateFips !== null ? stateDiseasesCacheKey(stateFips) : '',
  )
  const [state, setState] = useState<UseStateDiseasesResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<string | null>(
    initial && stateFips !== null ? stateFips : null,
  )

  useEffect(() => {
    if (stateFips === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    if (resolvedForRef.current === stateFips) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    // The casesByState analysis has stateFips as a hopped dimension
    // (through: 'county'), which the SemiLayer pushdown can't filter
    // on. Read the full (diseaseId, stateFips) grid and filter
    // client-side instead.
    Promise.all([
      beam.diseaseCountyYear.analyze.casesByState({}),
      beam.diseases.query({
        fields: ['id', 'slug', 'displayName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([analyzeRes, diseasesRes]) => {
        if (cancelled) return
        const stats = new Map<number, { total: number; counties: number; yearsCovered: number }>()
        for (const b of analyzeRes.buckets) {
          if (String(b.dims.stateFips ?? '') !== stateFips) continue
          const id = Number(b.dims.diseaseId)
          if (!Number.isFinite(id)) continue
          const cur = stats.get(id) ?? { total: 0, counties: 0, yearsCovered: 0 }
          cur.total += b.measures.total ?? 0
          cur.counties = Math.max(cur.counties, b.measures.counties ?? 0)
          cur.yearsCovered = Math.max(cur.yearsCovered, b.measures.yearsCovered ?? 0)
          stats.set(id, cur)
        }
        const rows: StateDiseaseRow[] = diseasesRes.rows
          .filter((d) => stats.has(d.id))
          .map((d) => {
            const s = stats.get(d.id)!
            return {
              id: d.id,
              slug: d.slug ?? '',
              displayName: d.displayName ?? '',
              oneLiner: d.oneLiner ?? null,
              total: s.total,
              counties: s.counties,
              yearsCovered: s.yearsCovered,
            }
          })
          .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName))
        resolvedForRef.current = stateFips
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
  }, [stateFips])

  return state
}
