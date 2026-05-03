import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { countyDiseasesCacheKey } from './cache-keys.js'

export { countyDiseasesCacheKey } from './cache-keys.js'

// Cumulative disease totals for a single county. Reads
// `diseaseCountyYear.casesByYear` filtered to one countyFips, then
// joins to `diseases.query` for displayName + slug.
//
// `countyFips` is a native column on diseaseCountyYear (no relation
// hop), so the where clause pushes down server-side.

export interface CountyDiseaseRow {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
  total: number
  latestYear: number
}

export interface UseCountyDiseasesResult {
  rows: CountyDiseaseRow[]
  loading: boolean
  error: Error | null
}

export function useCountyDiseases(countyFips: string | null): UseCountyDiseasesResult {
  const initial = useSSRData<CountyDiseaseRow[]>(
    countyFips !== null ? countyDiseasesCacheKey(countyFips) : '',
  )
  const [state, setState] = useState<UseCountyDiseasesResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<string | null>(
    initial && countyFips !== null ? countyFips : null,
  )

  useEffect(() => {
    if (countyFips === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    if (resolvedForRef.current === countyFips) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    Promise.all([
      beam.diseaseCountyYear.analyze.casesByYear({ where: { countyFips } }),
      beam.diseases.query({
        fields: ['id', 'slug', 'displayName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([analyzeRes, diseasesRes]) => {
        if (cancelled) return
        const stats = new Map<number, { total: number; latestYear: number }>()
        for (const b of analyzeRes.buckets) {
          const id = Number(b.dims.diseaseId)
          if (!Number.isFinite(id)) continue
          const cur = stats.get(id) ?? { total: 0, latestYear: 0 }
          cur.total += b.measures.total ?? 0
          cur.latestYear = Math.max(cur.latestYear, Number(b.dims.year) || 0)
          stats.set(id, cur)
        }
        const rows: CountyDiseaseRow[] = diseasesRes.rows
          .filter((d) => stats.has(d.id))
          .map((d) => {
            const s = stats.get(d.id)!
            return {
              id: d.id,
              slug: d.slug ?? '',
              displayName: d.displayName ?? '',
              oneLiner: d.oneLiner ?? null,
              total: s.total,
              latestYear: s.latestYear,
            }
          })
          .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName))
        resolvedForRef.current = countyFips
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
  }, [countyFips])

  return state
}
