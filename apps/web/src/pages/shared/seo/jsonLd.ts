// Schema.org payload generators. Pure functions — no DOM, no I/O.
// Pages compose these into the `jsonLd` field of `PageHead`.

export interface BreadcrumbItem {
  label: string
  /** Optional path; the leaf crumb is usually unlinked. */
  path?: string
}

export interface BreadcrumbListSchema {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    item?: string
  }>
}

export function breadcrumbListSchema(
  items: readonly BreadcrumbItem[],
  origin: string,
): BreadcrumbListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.path ? { item: `${origin}${item.path}` } : {}),
    })),
  }
}

export interface TickAnimalSchemaInput {
  slug: string
  commonName: string
  scientificName: string
  oneLiner?: string | null
}

export interface TickAnimalSchema {
  '@context': 'https://schema.org'
  '@type': 'Animal'
  name: string
  alternateName: string
  description?: string
  url: string
  taxonRank: 'species'
  parentTaxon: 'Ixodidae'
}

export function tickAnimalSchema(
  tick: TickAnimalSchemaInput,
  origin: string,
): TickAnimalSchema {
  const out: TickAnimalSchema = {
    '@context': 'https://schema.org',
    '@type': 'Animal',
    name: tick.commonName,
    alternateName: tick.scientificName,
    url: `${origin}/ticks/${tick.slug}`,
    taxonRank: 'species',
    parentTaxon: 'Ixodidae',
  }
  if (tick.oneLiner) out.description = tick.oneLiner
  return out
}
