import { useEffect, useState } from 'react'
import { beam } from '../../../lib/beam.js'

// Loads a single tick by slug. Returns the row plus a discriminated
// status — 'ok' | 'not-found' | 'error' — so the caller renders the
// right state without juggling null vs undefined vs error.

export type TickStatus = 'loading' | 'ok' | 'not-found' | 'error'

export interface TickRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
  heroPhotoUrl: string | null
  heroHeadColor: string | null
  heroBodyColor: string | null
  heroLegColor: string | null
  dangerLevel: 'low' | 'medium' | 'high'
}

export interface UseTickResult {
  tick: TickRow | null
  status: TickStatus
  error: Error | null
}

export function useTick(slug: string): UseTickResult {
  const [state, setState] = useState<UseTickResult>({
    tick: null,
    status: 'loading',
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState({ tick: null, status: 'loading', error: null })

    beam.ticks
      .query({
        where: { slug },
        fields: [
          'id',
          'slug',
          'commonName',
          'scientificName',
          'oneLiner',
          'heroPhotoUrl',
          'heroHeadColor',
          'heroBodyColor',
          'heroLegColor',
          'dangerLevel',
        ],
        limit: 1,
      })
      .then((res) => {
        if (cancelled) return
        const row = res.rows[0] as TickRow | undefined
        if (!row) {
          setState({ tick: null, status: 'not-found', error: null })
          return
        }
        setState({ tick: row, status: 'ok', error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ tick: null, status: 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return state
}
