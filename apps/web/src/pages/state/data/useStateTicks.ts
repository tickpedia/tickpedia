import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { stateTicksCacheKey } from './cache-keys.js'

export { stateTicksCacheKey } from './cache-keys.js'

// Ticks established (or reported) in a given state. Joins the
// `tick_state` editorial surveillance table with `ticks` for the
// human-readable name + slug + scientific binomial.

export interface StateTickRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
  prevalence: string | null
  peakMonths: number[] | null
}

export interface UseStateTicksResult {
  rows: StateTickRow[]
  loading: boolean
  error: Error | null
}

export function useStateTicks(stateFips: string | null): UseStateTicksResult {
  const initial = useSSRData<StateTickRow[]>(
    stateFips !== null ? stateTicksCacheKey(stateFips) : '',
  )
  const [state, setState] = useState<UseStateTicksResult>(() =>
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

    Promise.all([
      beam.tickState.query({
        where: { stateFips },
        fields: ['tickId', 'prevalence', 'peakMonths'],
        limit: 50,
      }),
      beam.ticks.query({
        fields: ['id', 'slug', 'commonName', 'scientificName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([joinRes, ticksRes]) => {
        if (cancelled) return
        const meta = new Map<number, { prevalence: string | null; peakMonths: number[] | null }>()
        for (const row of joinRes.rows) {
          meta.set(row.tickId, {
            prevalence: row.prevalence ?? null,
            peakMonths: (row.peakMonths as unknown as number[] | null | undefined) ?? null,
          })
        }
        const rows: StateTickRow[] = ticksRes.rows
          .filter((t) => meta.has(t.id))
          .map((t) => {
            const m = meta.get(t.id)!
            return {
              id: t.id,
              slug: t.slug ?? '',
              commonName: t.commonName ?? '',
              scientificName: t.scientificName ?? '',
              oneLiner: t.oneLiner ?? null,
              prevalence: m.prevalence,
              peakMonths: m.peakMonths,
            }
          })
          .sort((a, b) => prevalenceRank(b.prevalence) - prevalenceRank(a.prevalence) ||
            a.commonName.localeCompare(b.commonName))
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

function prevalenceRank(p: string | null): number {
  switch ((p ?? '').toLowerCase()) {
    case 'high': return 3
    case 'moderate': return 2
    case 'low': return 1
    default: return 0
  }
}
