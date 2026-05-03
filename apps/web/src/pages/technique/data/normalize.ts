// Pure normalize helper, split out of `useTechnique.ts` so the SSR
// prefetch can import it without dragging in the BeamClient. The
// runtime hook imports `lib/beam.ts`, which transitively requires the
// `@/beam` path alias — fine in Vite, but the tsx-driven prerender
// runs without a paths-aware tsconfig (paths trip tsx into CJS-style
// resolution against ESM-only `@semilayer/client`).
//
// Mirrors the prior phase 9 (`compose-index.ts`) and phase 10
// (`aggregate.ts`) splits.

export type TechniqueKind =
  | 'removal'
  | 'prevention'
  | 'aftercare'
  | 'diagnostic'
  | 'myth'

export interface TechniqueRow {
  id: number
  slug: string
  title: string
  oneLiner: string | null
  steps: string | null
  sourceUrl: string | null
  kind: TechniqueKind
  /** 0-10 — only meaningful when kind = 'prevention'. */
  preventionScore: number | null
  citations: string[]
}

const ALLOWED_KINDS: readonly TechniqueKind[] = [
  'removal',
  'prevention',
  'aftercare',
  'diagnostic',
  'myth',
]

// SemiLayer's generated metadata types declare `citations` as a single
// string and `preventionScore` as a non-nullable number, but the wire
// format honours the underlying Postgres `text[]` / nullable integer.
// Normalize here so the rest of the page can lean on a typed shape.
export function normalizeTechnique(raw: Record<string, unknown>): TechniqueRow {
  const kindRaw = typeof raw.kind === 'string' ? raw.kind : 'removal'
  const kind = (ALLOWED_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as TechniqueKind)
    : 'removal'
  const preventionScoreRaw = raw.preventionScore
  const preventionScore =
    kind === 'prevention' &&
    typeof preventionScoreRaw === 'number' &&
    Number.isFinite(preventionScoreRaw)
      ? Math.max(0, Math.min(10, Math.round(preventionScoreRaw)))
      : null
  const citationsRaw = raw.citations
  const citations: string[] = Array.isArray(citationsRaw)
    ? citationsRaw.filter((c): c is string => typeof c === 'string' && c.length > 0)
    : typeof citationsRaw === 'string' && citationsRaw.length > 0
      ? [citationsRaw]
      : []
  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    slug: typeof raw.slug === 'string' ? raw.slug : '',
    title: typeof raw.title === 'string' ? raw.title : '',
    oneLiner: typeof raw.oneLiner === 'string' ? raw.oneLiner : null,
    steps: typeof raw.steps === 'string' ? raw.steps : null,
    sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl : null,
    kind,
    preventionScore,
    citations,
  }
}
