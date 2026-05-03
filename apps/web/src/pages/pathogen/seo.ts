import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'
import { pathFor } from '../../routes/index.js'
import type { PathogenRow } from './data/normalize.js'

// SEO surface for /pathogens/[slug] and its sub-pages. Mirrors the
// shape of pages/disease/seo.ts, but emits schema.org `Taxon` instead
// of `MedicalCondition` (per step 05 §B3 — pathogens are biological
// taxa). A `MedicalEntity` fragment rides alongside so search results
// pick up the pathogenicity.

export type PathogenSeoInput = PathogenRow

export interface PathogenStats {
  /** Distinct counties where the pathogen has been detected. */
  counties: number | null
  /** Number of distinct tick species that carry it. */
  ticks: number | null
  /** Number of diseases this pathogen causes. */
  diseases: number | null
}

const PATHOGEN_TAGLINE =
  'A tick-borne pathogen — vectors, county-level presence, and the diseases it causes.'

const MAX_DESCRIPTION_LEN = 158

// Genera with unambiguous taxonomic structure that we can safely emit
// as `parentTaxon`. Powassan virus (and any future virus) gets nothing —
// virus taxonomy doesn't fit the schema.org `Taxon` parent model
// cleanly, and partial schemas hurt more than they help.
const KNOWN_GENERA = new Set(['Borrelia', 'Anaplasma', 'Babesia', 'Ehrlichia', 'Rickettsia'])

export function truncateDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LEN) return text
  const cutoff = text.slice(0, MAX_DESCRIPTION_LEN - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  return (lastSpace > 60 ? cutoff.slice(0, lastSpace) : cutoff) + '…'
}

export function buildPathogenHead(
  pathogen: PathogenSeoInput,
  stats: PathogenStats = emptyStats(),
  origin = DEFAULT_ORIGIN,
): PageHead {
  const canonicalPath = pathFor('pathogen', { slug: pathogen.slug })
  const description = truncateDescription(
    pathogen.oneLiner ?? `${pathogen.displayName}. ${PATHOGEN_TAGLINE}`,
  )
  return {
    title: `${pathogen.displayName} — Pathogens | Tickpedia`,
    description,
    canonicalPath,
    jsonLd: [
      taxonSchema(pathogen, origin),
      medicalEntityFragment(pathogen, stats, origin),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Pathogens', path: '/pathogens' },
          { label: pathogen.displayName },
        ],
        origin,
      ),
    ],
  }
}

export function buildPathogenSubPageHead(
  pathogen: PathogenSeoInput,
  section: 'Range' | 'Ticks' | 'Diseases',
  origin = DEFAULT_ORIGIN,
): PageHead {
  const sectionKind = sectionToKind(section)
  const canonicalPath = pathFor(sectionKind, { slug: pathogen.slug })
  const description = truncateDescription(sectionDescription(pathogen, section))
  return {
    title: `${pathogen.displayName} — ${section} | Tickpedia`,
    description,
    canonicalPath,
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Pathogens', path: '/pathogens' },
          { label: pathogen.displayName, path: pathFor('pathogen', { slug: pathogen.slug }) },
          { label: section },
        ],
        origin,
      ),
    ],
  }
}

export function buildPathogensIndexHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'Pathogens — Tickpedia',
    description:
      'Tick-borne pathogens tracked by Tickpedia: vectors, county-level presence, and the diseases each one causes.',
    canonicalPath: '/pathogens',
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Pathogens' },
        ],
        origin,
      ),
    ],
  }
}

function sectionToKind(section: string) {
  switch (section) {
    case 'Range':    return 'pathogen-range' as const
    case 'Ticks':    return 'pathogen-ticks' as const
    case 'Diseases': return 'pathogen-diseases' as const
    default:         throw new Error(`unknown pathogen section: ${section}`)
  }
}

function sectionDescription(pathogen: PathogenSeoInput, section: string): string {
  const name = pathogen.displayName
  switch (section) {
    case 'Range':
      return `Counties where ${name} has been detected, mapped onto a US choropleth and ranked by state.`
    case 'Ticks':
      return `Tick species that carry ${name}, with links to the field-guide entry for each.`
    case 'Diseases':
      return `Diseases ${name} causes, with case totals and the ticks that carry them.`
    default:
      return `${name} — Tickpedia`
  }
}

function emptyStats(): PathogenStats {
  return { counties: null, ticks: null, diseases: null }
}

interface TaxonSchema {
  '@context': 'https://schema.org'
  '@type': 'Taxon'
  name: string
  url: string
  alternateName?: string[]
  description?: string
  taxonRank?: string
  parentTaxon?: { '@type': 'Taxon'; name: string }
}

export function taxonSchema(pathogen: PathogenSeoInput, origin: string): TaxonSchema {
  const out: TaxonSchema = {
    '@context': 'https://schema.org',
    '@type': 'Taxon',
    name: pathogen.displayName,
    url: `${origin}${pathFor('pathogen', { slug: pathogen.slug })}`,
  }
  const alts = collectAlternateNames(pathogen)
  if (alts.length > 0) out.alternateName = alts
  if (pathogen.oneLiner) out.description = pathogen.oneLiner

  const rank = inferTaxonRank(pathogen.scientificName)
  if (rank) out.taxonRank = rank

  const parent = inferParentGenus(pathogen.scientificName)
  if (parent) out.parentTaxon = { '@type': 'Taxon', name: parent }

  return out
}

interface MedicalEntitySchema {
  '@context': 'https://schema.org'
  '@type': 'MedicalEntity'
  name: string
  url: string
  description?: string
  relevantSpecialty: string
}

export function medicalEntityFragment(
  pathogen: PathogenSeoInput,
  _stats: PathogenStats,
  origin: string,
): MedicalEntitySchema {
  const out: MedicalEntitySchema = {
    '@context': 'https://schema.org',
    '@type': 'MedicalEntity',
    name: pathogen.displayName,
    url: `${origin}${pathFor('pathogen', { slug: pathogen.slug })}`,
    relevantSpecialty: 'Infectious disease',
  }
  if (pathogen.oneLiner) out.description = pathogen.oneLiner
  return out
}

function collectAlternateNames(pathogen: PathogenSeoInput): string[] {
  const out: string[] = []
  if (pathogen.aliases) out.push(...pathogen.aliases)
  if (
    pathogen.scientificName &&
    pathogen.scientificName.length > 0 &&
    pathogen.scientificName !== pathogen.displayName
  ) {
    out.push(pathogen.scientificName)
  }
  // De-dup case-insensitively while preserving first-seen casing.
  const seen = new Set<string>()
  return out.filter((n) => {
    const k = n.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function inferTaxonRank(scientificName: string): string | null {
  if (!scientificName) return null
  // Any binomial-or-longer → species rank. Subspecies / "sensu stricto"
  // qualifiers are still indexed under species. Single-word names are
  // ambiguous (genus vs virus vs strain) and emit no rank.
  const words = scientificName.trim().split(/\s+/).filter(Boolean)
  return words.length >= 2 ? 'species' : null
}

export function inferParentGenus(scientificName: string): string | null {
  if (!scientificName) return null
  const first = scientificName.trim().split(/\s+/)[0] ?? ''
  if (KNOWN_GENERA.has(first)) return first
  return null
}
