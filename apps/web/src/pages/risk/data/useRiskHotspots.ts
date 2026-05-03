import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { riskHotspotsCacheKey } from './cache-keys.js'

export { riskHotspotsCacheKey } from './cache-keys.js'

// Top-12 hotspot counties for the /risk leaderboard preview. Reads
// `diseaseCountyYear.countyHotspots` (already public, top 100) and
// joins client-side against counties + states for slug + state code.

export interface RiskHotspotRow {
  fips: string
  slug: string
  countyName: string
  stateSlug: string
  stateCode: string
  total: number
  diseases: number
  mostRecentYear: number
}

export interface UseRiskHotspotsResult {
  rows: RiskHotspotRow[]
  loading: boolean
  error: Error | null
}

const HOTSPOTS_PREVIEW_COUNT = 12

export function useRiskHotspots(): UseRiskHotspotsResult {
  const initial = useSSRData<RiskHotspotRow[]>(riskHotspotsCacheKey())
  const [state, setState] = useState<UseRiskHotspotsResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )

  useEffect(() => {
    if (initial) return

    let cancelled = false
    Promise.all([
      beam.diseaseCountyYear.analyze.countyHotspots(),
      beam.counties.query({
        fields: ['fips', 'slug', 'countyName', 'stateFips'],
        limit: 5000,
      }),
      beam.states.query({ fields: ['fips', 'slug', 'code'], limit: 60 }),
    ])
      .then(([hotspotsRes, countiesRes, statesRes]) => {
        if (cancelled) return
        const stateByFips = new Map(statesRes.rows.map((s) => [s.fips ?? '', s]))
        const countyByFips = new Map(countiesRes.rows.map((c) => [c.fips ?? '', c]))
        const rows: RiskHotspotRow[] = hotspotsRes.buckets
          .map((b) => {
            const fips = String((b.dims as { countyFips?: unknown }).countyFips ?? '')
            const county = countyByFips.get(fips)
            const stateFips = (b.dims as { stateFips?: unknown }).stateFips ?? county?.stateFips
            const state = typeof stateFips === 'string' ? stateByFips.get(stateFips) : undefined
            return {
              fips,
              slug: county?.slug ?? '',
              countyName: county?.countyName ?? '',
              stateSlug: state?.slug ?? '',
              stateCode: state?.code ?? '',
              total: b.measures.total ?? 0,
              diseases: (b.measures as { diseases?: number }).diseases ?? 0,
              mostRecentYear: (b.measures as { mostRecentYear?: number }).mostRecentYear ?? 0,
            }
          })
          .filter((r) => r.fips && r.slug && r.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, HOTSPOTS_PREVIEW_COUNT)

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
