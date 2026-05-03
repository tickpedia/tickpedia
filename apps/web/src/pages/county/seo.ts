import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'
import { pathFor } from '../../routes/index.js'
import { formatCountyName } from './data/county-name.js'

// SEO surface for /counties and /counties/[state]/[slug]. Counties
// are the first family in the URL contract that emits a geo block on
// the Place schema — Google's "near me" rich-results pipeline uses
// it for the map preview that lands above the fold for "lyme cases
// in [county]" queries.

export interface CountySeoInput {
  fips: string
  slug: string
  stateFips: string
  countyName: string
  latitude: number | null
  longitude: number | null
}

export interface CountyParentState {
  slug: string
  name: string
  code: string
}

const COUNTY_TAGLINE = 'tick species reported here, CDC-reported disease totals, and the closest counties.'

const MAX_DESCRIPTION_LEN = 158

export function truncateDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LEN) return text
  const cutoff = text.slice(0, MAX_DESCRIPTION_LEN - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  return (lastSpace > 60 ? cutoff.slice(0, lastSpace) : cutoff) + '…'
}

export function buildCountyHead(
  county: CountySeoInput,
  parentState: CountyParentState,
  origin = DEFAULT_ORIGIN,
): PageHead {
  const displayName = formatCountyName(county.countyName)
  const canonicalPath = pathFor('county', {
    state: parentState.slug,
    slug: county.slug,
  })
  const description = truncateDescription(
    `${displayName}, ${parentState.name} — ${COUNTY_TAGLINE}`,
  )
  return {
    title: `${displayName} — ${parentState.name} | Tickpedia`,
    description,
    canonicalPath,
    jsonLd: [
      placeSchema(county, parentState, origin),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'States', path: '/states' },
          { label: parentState.name, path: pathFor('state', { slug: parentState.slug }) },
          { label: 'Counties', path: pathFor('state-counties', { slug: parentState.slug }) },
          { label: displayName },
        ],
        origin,
      ),
    ],
  }
}

export function buildCountiesLeaderboardHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'Counties — top-100 by tick-borne disease load | Tickpedia',
    description:
      'The 100 U.S. counties with the highest cumulative tick-borne disease cases reported to CDC. Each row links through to the county page.',
    canonicalPath: '/counties',
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Counties' },
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
  containedInPlace: {
    '@type': 'AdministrativeArea'
    name: string
    url: string
    containedInPlace: { '@type': 'Country'; name: string }
  }
  geo?: {
    '@type': 'GeoCoordinates'
    latitude: number
    longitude: number
  }
}

export function placeSchema(
  county: CountySeoInput,
  parentState: CountyParentState,
  origin: string,
): PlaceSchema {
  const displayName = formatCountyName(county.countyName)
  const out: PlaceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: displayName,
    url: `${origin}${pathFor('county', { state: parentState.slug, slug: county.slug })}`,
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: parentState.name,
      url: `${origin}${pathFor('state', { slug: parentState.slug })}`,
      containedInPlace: { '@type': 'Country', name: 'United States' },
    },
  }
  if (county.fips) {
    out.alternateName = [county.fips]
  }
  if (county.latitude !== null && county.longitude !== null) {
    out.geo = {
      '@type': 'GeoCoordinates',
      latitude: county.latitude,
      longitude: county.longitude,
    }
  }
  return out
}
