// Pure helper for the /facts index. Lives in its own module (no
// `lib/beam.ts` import) so the SSR prerender can re-use it without
// dragging the runtime BeamClient through Vite path aliases that
// tsx can't resolve at build time.
//
// The runtime hook `useFactsIndex` and the build-time
// `prefetchFactsIndex` both call into this function.

export interface FactsIndexRow {
  id: number
  slug: string
  body: string
  citationUrl: string | null
  /** Up to 4 entity chips per row, sourced from the join lenses. */
  chips: ReadonlyArray<{
    kind: 'tick' | 'disease' | 'technique'
    slug: string
    label: string
  }>
  /** Total ref count across kinds (lets the row render "+N more" overflow). */
  totalRefs: number
}

export interface IndexFactMeta {
  id: number
  slug: string | null
  body: string | null
  citationUrl: string | null
}

export interface TickJoinRow { wildFactId: number; tickId: number }
export interface DiseaseJoinRow { wildFactId: number; diseaseId: number }
export interface TechniqueJoinRow {
  wildFactId: number
  removalTechniqueId: number
}
export interface TickCatalogRow {
  id: number
  slug: string | null
  commonName: string | null
}
export interface DiseaseCatalogRow {
  id: number
  slug: string | null
  displayName: string | null
}
export interface TechniqueCatalogRow {
  id: number
  slug: string | null
  title: string | null
}

const MAX_CHIPS_PER_ROW = 4

export function composeIndexRows(
  feedMetas: ReadonlyArray<IndexFactMeta>,
  tickJoin: ReadonlyArray<TickJoinRow>,
  diseaseJoin: ReadonlyArray<DiseaseJoinRow>,
  techniqueJoin: ReadonlyArray<TechniqueJoinRow>,
  ticks: ReadonlyArray<TickCatalogRow>,
  diseases: ReadonlyArray<DiseaseCatalogRow>,
  techniques: ReadonlyArray<TechniqueCatalogRow>,
): FactsIndexRow[] {
  const tickById = new Map(ticks.map((t) => [t.id, t]))
  const diseaseById = new Map(diseases.map((d) => [d.id, d]))
  const techniqueById = new Map(techniques.map((tq) => [tq.id, tq]))

  return feedMetas.map((md) => {
    const allChips: FactsIndexRow['chips'] = [
      ...tickJoin
        .filter((r) => r.wildFactId === md.id)
        .map((r) => tickById.get(r.tickId))
        .filter((t): t is TickCatalogRow => Boolean(t))
        .map((t) => ({
          kind: 'tick' as const,
          slug: t.slug ?? '',
          label: t.commonName ?? '',
        })),
      ...diseaseJoin
        .filter((r) => r.wildFactId === md.id)
        .map((r) => diseaseById.get(r.diseaseId))
        .filter((d): d is DiseaseCatalogRow => Boolean(d))
        .map((d) => ({
          kind: 'disease' as const,
          slug: d.slug ?? '',
          label: d.displayName ?? '',
        })),
      ...techniqueJoin
        .filter((r) => r.wildFactId === md.id)
        .map((r) => techniqueById.get(r.removalTechniqueId))
        .filter((tq): tq is TechniqueCatalogRow => Boolean(tq))
        .map((tq) => ({
          kind: 'technique' as const,
          slug: tq.slug ?? '',
          label: tq.title ?? '',
        })),
    ]
    return {
      id: md.id,
      slug: md.slug ?? '',
      body: md.body ?? '',
      citationUrl: md.citationUrl ?? null,
      chips: allChips.slice(0, MAX_CHIPS_PER_ROW),
      totalRefs: allChips.length,
    }
  })
}
