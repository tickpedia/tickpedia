import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { pathogenCountiesCacheKey } from './cache-keys.js'
import {
  aggregateCounties,
  type PathogenCountiesData,
  type PathogenCountyRow,
} from './aggregates.js'

export { pathogenCountiesCacheKey } from './cache-keys.js'
export {
  aggregateCounties,
  type PathogenCountiesData,
  type PathogenCountyRow,
} from './aggregates.js'

// Pathogen presence rolled up by state FIPS (derived client-side from
// raw `pathogen_county` rows, not the precomputed `presenceByPathogen`
// analyse — that one currently returns 0 buckets in prod even though
// the underlying rows are there). Drives the choropleth + leaderboard
// on /pathogens/[slug] and /pathogens/[slug]/range.

export interface UsePathogenCountiesResult {
  data: PathogenCountiesData | null
  loading: boolean
  error: Error | null
}

export function usePathogenCounties(pathogenId: number | null): UsePathogenCountiesResult {
  const initial = useSSRData<PathogenCountiesData>(
    pathogenId !== null ? pathogenCountiesCacheKey(pathogenId) : '',
  )
  const [state, setState] = useState<UsePathogenCountiesResult>(() =>
    initial
      ? { data: initial, loading: false, error: null }
      : { data: null, loading: true, error: null },
  )
  const resolvedForRef = useRef<number | null>(initial && pathogenId !== null ? pathogenId : null)

  useEffect(() => {
    if (pathogenId === null) {
      resolvedForRef.current = null
      setState({ data: null, loading: true, error: null })
      return
    }
    if (resolvedForRef.current === pathogenId) return

    let cancelled = false
    setState({ data: null, loading: true, error: null })

    beam.pathogenCounty
      .query({
        where: { pathogenId, status: 'present' },
        fields: ['countyFips', 'year'],
        limit: 5000,
      })
      .then((res) => {
        if (cancelled) return
        const data = aggregateCounties(res.rows as PathogenCountyRow[])
        resolvedForRef.current = pathogenId
        setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ data: null, loading: false, error })
      })

    return () => {
      cancelled = true
    }
  }, [pathogenId])

  return state
}
