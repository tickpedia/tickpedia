import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { techniqueDiseasesCacheKey } from './cache-keys.js'

export { techniqueDiseasesCacheKey } from './cache-keys.js'

// Diseases this technique can help prevent — derived through the
// tick → disease graph. When the technique applies to ticks A, B, C,
// the rail is the union of diseases each carries.
//
// The hook takes the resolved tick-id list rather than the technique
// id so the chain is explicit and the SSR prefetch can reuse the
// same shape without a second `tick_removal_techniques` lookup.

export interface TechniqueDiseaseRow {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
}

export interface UseTechniqueDiseasesResult {
  rows: TechniqueDiseaseRow[]
  loading: boolean
  error: Error | null
}

export function useTechniqueDiseases(
  techniqueId: number | null,
  tickIds: readonly number[],
): UseTechniqueDiseasesResult {
  const initial = useSSRData<TechniqueDiseaseRow[]>(
    techniqueId !== null ? techniqueDiseasesCacheKey(techniqueId) : '',
  )
  const [state, setState] = useState<UseTechniqueDiseasesResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<string>(
    initial && techniqueId !== null ? signatureFor(techniqueId, tickIds) : '',
  )
  const signature = signatureFor(techniqueId, tickIds)

  useEffect(() => {
    if (techniqueId === null || tickIds.length === 0) {
      resolvedForRef.current = signature
      setState({ rows: [], loading: false, error: null })
      return
    }
    if (resolvedForRef.current === signature) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    Promise.all([
      beam.tickDiseases.query({
        where: { tickId: { $in: tickIds as number[] } },
        fields: ['diseaseId'],
        limit: 200,
      }),
      beam.diseases.query({
        fields: ['id', 'slug', 'displayName', 'oneLiner'],
        limit: 100,
      }),
    ])
      .then(([joinRes, diseasesRes]) => {
        if (cancelled) return
        const ids = new Set(joinRes.rows.map((r) => r.diseaseId))
        const rows: TechniqueDiseaseRow[] = diseasesRes.rows
          .filter((d) => ids.has(d.id))
          .map((d) => ({
            id: d.id,
            slug: d.slug ?? '',
            displayName: d.displayName ?? '',
            oneLiner: d.oneLiner ?? null,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
        resolvedForRef.current = signature
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
  }, [signature, techniqueId, tickIds])

  return state
}

function signatureFor(
  techniqueId: number | null,
  tickIds: readonly number[],
): string {
  if (techniqueId === null) return ''
  return `${techniqueId}:${[...tickIds].sort((a, b) => a - b).join(',')}`
}
