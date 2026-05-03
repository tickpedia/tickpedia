import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'
import { pathFor } from '../../routes/index.js'

// SEO surface for /diseases/[slug] and its sub-pages. Mirrors the
// shape of pages/tick/seo.ts — a single builder per page kind so the
// SSR prerender and the client-side `useDocumentHead` agree.

export interface DiseaseSeoInput {
  slug: string
  displayName: string
  oneLiner: string | null
  aliases?: readonly string[] | null
}

export interface DiseaseEpidemiology {
  /** Total CDC-reported cases across the available years. */
  totalCases: number | null
  /** Number of distinct states with at least one case. */
  states: number | null
  /** Display name of the most common pathogen, when known. */
  topPathogen: string | null
  /** Peak month label ("July"), null if seasonality is too flat. */
  peakMonth: string | null
}

const DISEASE_TAGLINE = 'A tick-borne illness — cases, seasonality, and the ticks that carry it.'

const MAX_DESCRIPTION_LEN = 158

export function truncateDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LEN) return text
  const cutoff = text.slice(0, MAX_DESCRIPTION_LEN - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  return (lastSpace > 60 ? cutoff.slice(0, lastSpace) : cutoff) + '…'
}

export function buildDiseaseHead(
  disease: DiseaseSeoInput,
  epidemiology: DiseaseEpidemiology = emptyEpidemiology(),
  origin = DEFAULT_ORIGIN,
): PageHead {
  const canonicalPath = pathFor('disease', { slug: disease.slug })
  const description = truncateDescription(
    disease.oneLiner ?? `${disease.displayName}. ${DISEASE_TAGLINE}`,
  )
  return {
    title: `${disease.displayName} — Diseases | Tickpedia`,
    description,
    canonicalPath,
    jsonLd: [
      medicalConditionSchema(disease, epidemiology, origin),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Diseases', path: '/diseases' },
          { label: disease.displayName },
        ],
        origin,
      ),
    ],
  }
}

export function buildDiseaseSubPageHead(
  disease: DiseaseSeoInput,
  section: 'States' | 'Seasonality' | 'Ticks' | 'Pathogens' | 'History',
  origin = DEFAULT_ORIGIN,
): PageHead {
  const sectionKind = sectionToKind(section)
  const canonicalPath = pathFor(sectionKind, { slug: disease.slug })
  const description = truncateDescription(
    sectionDescription(disease, section),
  )
  return {
    title: `${disease.displayName} — ${section} | Tickpedia`,
    description,
    canonicalPath,
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Diseases', path: '/diseases' },
          { label: disease.displayName, path: pathFor('disease', { slug: disease.slug }) },
          { label: section },
        ],
        origin,
      ),
    ],
  }
}

export function buildDiseasesIndexHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'Diseases — Tickpedia',
    description:
      'Tick-borne illnesses tracked by Tickpedia: cases, seasonality, and the ticks that carry each one.',
    canonicalPath: '/diseases',
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Diseases' },
        ],
        origin,
      ),
    ],
  }
}

function sectionToKind(section: string) {
  switch (section) {
    case 'States':       return 'disease-states' as const
    case 'Seasonality':  return 'disease-seasonality' as const
    case 'Ticks':        return 'disease-ticks' as const
    case 'Pathogens':    return 'disease-pathogens' as const
    case 'History':      return 'disease-history' as const
    default:             throw new Error(`unknown disease section: ${section}`)
  }
}

function sectionDescription(disease: DiseaseSeoInput, section: string): string {
  const name = disease.displayName
  switch (section) {
    case 'States':
      return `State-by-state CDC case totals for ${name}, mapped onto a US choropleth and a top-states leaderboard.`
    case 'Seasonality':
      return `Monthly seasonality for ${name} — when CDC reports peak across the calendar year.`
    case 'Ticks':
      return `Tick species that carry ${name}, with links to the field-guide entry for each.`
    case 'Pathogens':
      return `Pathogens that cause ${name}, with their canonical names and aliases.`
    case 'History':
      return `Year-over-year CDC case totals for ${name}.`
    default:
      return `${name} — Tickpedia`
  }
}

function emptyEpidemiology(): DiseaseEpidemiology {
  return { totalCases: null, states: null, topPathogen: null, peakMonth: null }
}

interface MedicalConditionSchema {
  '@context': 'https://schema.org'
  '@type': 'MedicalCondition'
  name: string
  alternateName?: string[]
  description?: string
  url: string
  cause?: { '@type': 'MedicalEntity'; name: string }
  epidemiology?: string
}

export function medicalConditionSchema(
  disease: DiseaseSeoInput,
  epidemiology: DiseaseEpidemiology,
  origin: string,
): MedicalConditionSchema {
  const out: MedicalConditionSchema = {
    '@context': 'https://schema.org',
    '@type': 'MedicalCondition',
    name: disease.displayName,
    url: `${origin}${pathFor('disease', { slug: disease.slug })}`,
  }
  if (disease.aliases && disease.aliases.length > 0) {
    out.alternateName = [...disease.aliases]
  }
  if (disease.oneLiner) {
    out.description = disease.oneLiner
  }
  if (epidemiology.topPathogen) {
    out.cause = { '@type': 'MedicalEntity', name: epidemiology.topPathogen }
  }
  const epi = epidemiologySentence(epidemiology)
  if (epi) out.epidemiology = epi
  return out
}

function epidemiologySentence(e: DiseaseEpidemiology): string | null {
  const parts: string[] = []
  if (e.totalCases !== null && e.totalCases > 0) {
    parts.push(`${e.totalCases.toLocaleString()} reported cases`)
  }
  if (e.states !== null && e.states > 0) {
    parts.push(`across ${e.states} ${e.states === 1 ? 'state' : 'states'}`)
  }
  if (e.peakMonth) {
    parts.push(`peak month ${e.peakMonth}`)
  }
  if (parts.length === 0) return null
  return parts.join('; ') + '.'
}
