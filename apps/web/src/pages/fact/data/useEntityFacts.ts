import { useEffect, useRef, useState } from 'react'
import { beam } from '../../../lib/beam.js'
import { useSSRData } from '../../../ssr/SSRDataProvider.js'
import { entityFactsCacheKey } from './cache-keys.js'

export { entityFactsCacheKey } from './cache-keys.js'

// "Wild facts that reference this entity" — used on tick / disease /
// technique pages to retro-fit the §B3 "every entity page links to
// every wild fact attached" cross-link rail.
//
// Reads the matching join lens for the entity kind, then looks up the
// fact rows. Empty rails hide their host section.

export type EntityFactKind = 'tick' | 'disease' | 'technique'

export interface EntityFactRow {
  id: number
  slug: string
  body: string
  citationUrl: string | null
}

export interface UseEntityFactsResult {
  rows: EntityFactRow[]
  loading: boolean
  error: Error | null
}

export function useEntityFacts(
  kind: EntityFactKind,
  entityId: number | null,
): UseEntityFactsResult {
  const initial = useSSRData<EntityFactRow[]>(
    entityId !== null ? entityFactsCacheKey(kind, entityId) : '',
  )
  const [state, setState] = useState<UseEntityFactsResult>(() =>
    initial
      ? { rows: initial, loading: false, error: null }
      : { rows: [], loading: true, error: null },
  )
  const resolvedForRef = useRef<string | null>(
    initial && entityId !== null ? `${kind}:${entityId}` : null,
  )

  useEffect(() => {
    if (entityId === null) {
      resolvedForRef.current = null
      setState({ rows: [], loading: true, error: null })
      return
    }
    const resolveKey = `${kind}:${entityId}`
    if (resolvedForRef.current === resolveKey) return

    let cancelled = false
    setState({ rows: [], loading: true, error: null })

    const joinPromise = (() => {
      if (kind === 'tick') {
        return beam.wildFactTicks
          .query({ where: { tickId: entityId }, fields: ['wildFactId'], limit: 50 })
          .then((res) => res.rows.map((r) => r.wildFactId))
      }
      if (kind === 'disease') {
        return beam.wildFactDiseases
          .query({ where: { diseaseId: entityId }, fields: ['wildFactId'], limit: 50 })
          .then((res) => res.rows.map((r) => r.wildFactId))
      }
      return beam.wildFactRemovalTechniques
        .query({
          where: { removalTechniqueId: entityId },
          fields: ['wildFactId'],
          limit: 50,
        })
        .then((res) => res.rows.map((r) => r.wildFactId))
    })()

    joinPromise
      .then(async (factIds) => {
        if (cancelled) return
        if (factIds.length === 0) {
          resolvedForRef.current = resolveKey
          setState({ rows: [], loading: false, error: null })
          return
        }
        const factsRes = await beam.wildFacts.query({
          where: { id: { $in: factIds } },
          fields: ['id', 'slug', 'body', 'citationUrl'],
          limit: 50,
        })
        if (cancelled) return
        const rows: EntityFactRow[] = factsRes.rows.map((r) => ({
          id: r.id,
          slug: r.slug ?? '',
          body: r.body ?? '',
          citationUrl: r.citationUrl ?? null,
        }))
        resolvedForRef.current = resolveKey
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
  }, [kind, entityId])

  return state
}
