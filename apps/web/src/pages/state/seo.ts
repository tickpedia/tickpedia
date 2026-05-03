import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'
import { pathFor } from '../../routes/index.js'

// SEO surface for /states/[slug] and its sub-pages. Mirrors the
// disease seo shape — a single builder per page kind so the SSR
// prerender and the client-side `useDocumentHead` agree.

export interface StateSeoInput {
  slug: string
  name: string
  code: string
}

const STATE_TAGLINE = 'Tick species established here, disease cases by county, and the county-level breakdown.'

const MAX_DESCRIPTION_LEN = 158

export function truncateDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LEN) return text
  const cutoff = text.slice(0, MAX_DESCRIPTION_LEN - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  return (lastSpace > 60 ? cutoff.slice(0, lastSpace) : cutoff) + '…'
}

export function buildStateHead(
  state: StateSeoInput,
  origin = DEFAULT_ORIGIN,
): PageHead {
  const canonicalPath = pathFor('state', { slug: state.slug })
  const description = truncateDescription(`${state.name} — ${STATE_TAGLINE}`)
  return {
    title: `${state.name} — States | Tickpedia`,
    description,
    canonicalPath,
    jsonLd: [
      placeSchema(state, origin),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'States', path: '/states' },
          { label: state.name },
        ],
        origin,
      ),
    ],
  }
}

export function buildStateSubPageHead(
  state: StateSeoInput,
  section: 'Ticks' | 'Diseases' | 'Counties',
  origin = DEFAULT_ORIGIN,
): PageHead {
  const sectionKind = sectionToKind(section)
  const canonicalPath = pathFor(sectionKind, { slug: state.slug })
  const description = truncateDescription(sectionDescription(state, section))
  return {
    title: `${state.name} — ${section} | Tickpedia`,
    description,
    canonicalPath,
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'States', path: '/states' },
          { label: state.name, path: pathFor('state', { slug: state.slug }) },
          { label: section },
        ],
        origin,
      ),
    ],
  }
}

export function buildStatesIndexHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'States — Tickpedia',
    description:
      'Tick distribution and disease cases for every U.S. state. Established species, CDC-reported totals, and county-level breakdowns.',
    canonicalPath: '/states',
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'States' },
        ],
        origin,
      ),
    ],
  }
}

interface PlaceSchema {
  '@context': 'https://schema.org'
  '@type': 'Place'
  name: string
  url: string
  alternateName?: string[]
  containedInPlace: { '@type': 'Country'; name: string }
}

export function placeSchema(state: StateSeoInput, origin: string): PlaceSchema {
  const out: PlaceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: state.name,
    url: `${origin}${pathFor('state', { slug: state.slug })}`,
    containedInPlace: { '@type': 'Country', name: 'United States' },
  }
  if (state.code) {
    out.alternateName = [state.code]
  }
  return out
}

function sectionToKind(section: string) {
  switch (section) {
    case 'Ticks':    return 'state-ticks' as const
    case 'Diseases': return 'state-diseases' as const
    case 'Counties': return 'state-counties' as const
    default:
      throw new Error(`Unknown state sub-page section: ${section}`)
  }
}

function sectionDescription(state: StateSeoInput, section: string): string {
  switch (section) {
    case 'Ticks':
      return `Tick species established in ${state.name}: prevalence, peak months, and the diseases each carries.`
    case 'Diseases':
      return `CDC-reported tick-borne disease cases in ${state.name}, by disease and county.`
    case 'Counties':
      return `Every county in ${state.name}, with FIPS codes and links to county pages.`
    default:
      return `${state.name} — ${section}.`
  }
}
