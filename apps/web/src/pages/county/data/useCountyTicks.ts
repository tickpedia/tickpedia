import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { countyTicksCacheKey } from './cache-keys.js'

export { countyTicksCacheKey } from './cache-keys.js'

// Ticks reported or established in this county. Joins
// `tickCounty.query({ where: { countyFips } })` with `ticks.query` for
// human-readable names. `countyFips` is native on tickCounty, so the
// where clause pushes down.

export interface CountyTickRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
  status: string | null
  earliestYear: number | null
}

export interface UseCountyTicksResult {
  rows: CountyTickRow[]
  loading: boolean
  error: Error | null
}

export function useCountyTicks(countyFips: string | null): UseCountyTicksResult {
  const initial = useSSRData<CountyTickRow[]>(
    countyFips !== null ? countyTicksCacheKey(countyFips) : '',
  )
  const [state, setState] = useState<UseCountyTicksResult>(() =>
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
      beam.tickCounty.query({
        where: { countyFips },
        fields: ['tickId', 'status', 'year'],
        limit: 100,
      }),
      beam.ticks.query({
        fields: ['id', 'slug', 'commonName', 'scientificName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([joinRes, ticksRes]) => {
        if (cancelled) return
        // Aggregate by tickId — multiple rows mean reported across
        // years; keep the strongest status and earliest year.
        const meta = new Map<number, { status: string | null; earliestYear: number | null }>()
        for (const r of joinRes.rows) {
          const cur = meta.get(r.tickId) ?? { status: null, earliestYear: null }
          cur.status = strongerStatus(cur.status, r.status ?? null)
          if (typeof r.year === 'number') {
            cur.earliestYear = cur.earliestYear === null ? r.year : Math.min(cur.earliestYear, r.year)
          }
          meta.set(r.tickId, cur)
        }
        const rows: CountyTickRow[] = ticksRes.rows
          .filter((t) => meta.has(t.id))
          .map((t) => {
            const m = meta.get(t.id)!
            return {
              id: t.id,
              slug: t.slug ?? '',
              commonName: t.commonName ?? '',
              scientificName: t.scientificName ?? '',
              oneLiner: t.oneLiner ?? null,
              status: m.status,
              earliestYear: m.earliestYear,
            }
          })
          .sort((a, b) => statusRank(b.status) - statusRank(a.status) ||
            a.commonName.localeCompare(b.commonName))
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

function statusRank(s: string | null): number {
  switch ((s ?? '').toLowerCase()) {
    case 'established': return 3
    case 'reported': return 2
    case 'no records': return 1
    default: return 0
  }
}

function strongerStatus(a: string | null, b: string | null): string | null {
  return statusRank(a) >= statusRank(b) ? a : b
}
