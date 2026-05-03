// Pure normalize helper, split out of `usePathogen.ts` so the SSR
// prefetch can import it without dragging in the BeamClient. Same
// pattern as `pages/technique/data/normalize.ts` — keeps the prerender
// chain free of `lib/beam.ts`.

export interface PathogenRow {
  id: number
  slug: string
  displayName: string
  scientificName: string
  oneLiner: string | null
  aliases: string[] | null
}

export function normalizePathogen(raw: Record<string, unknown>): PathogenRow {
  const aliasesRaw = raw.aliases
  const aliases: string[] | null = Array.isArray(aliasesRaw)
    ? aliasesRaw.filter((a): a is string => typeof a === 'string' && a.length > 0)
    : null
  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    slug: typeof raw.slug === 'string' ? raw.slug : '',
    displayName: typeof raw.displayName === 'string' ? raw.displayName : '',
    scientificName: typeof raw.scientificName === 'string' ? raw.scientificName : '',
    oneLiner: typeof raw.oneLiner === 'string' ? raw.oneLiner : null,
    aliases: aliases && aliases.length > 0 ? aliases : null,
  }
}
