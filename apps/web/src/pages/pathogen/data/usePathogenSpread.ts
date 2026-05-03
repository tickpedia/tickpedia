import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { pathogenSpreadCacheKey } from './cache-keys.js'
import {
  aggregateSpread,
  type PathogenCountyRow,
  type PathogenSpreadData,
  type PathogenSpreadRow,
} from './aggregates.js'

export { pathogenSpreadCacheKey } from './cache-keys.js'
export {
  aggregateSpread,
  type PathogenSpreadData,
  type PathogenSpreadRow,
} from './aggregates.js'

// Year-over-year detection spread for the /range sub-page. Mirrors the
// `tickCounty.spreadOverTime` chart on /ticks/[slug]/range, but
// derived from raw `pathogen_county` rows because the precomputed
// `presenceByYear` analyse returns 0 buckets in prod today.

export interface UsePathogenSpreadResult {
  data: PathogenSpreadData | null
  loading: boolean
  error: Error | null
}

export function usePathogenSpread(pathogenId: number | null): UsePathogenSpreadResult {
  const initial = useSSRData<PathogenSpreadData>(
    pathogenId !== null ? pathogenSpreadCacheKey(pathogenId) : '',
  )
  const [state, setState] = useState<UsePathogenSpreadResult>(() =>
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
        const data = aggregateSpread(res.rows as PathogenCountyRow[])
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
