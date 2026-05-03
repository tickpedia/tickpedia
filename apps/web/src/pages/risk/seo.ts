import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'
import { pathFor } from '../../routes/index.js'

// SEO surface for /risk and /risk/[disease-slug]. Per step 05 §B3
// emits `Map` (`@type: 'Map'`) + `BreadcrumbList`. The disease-
// filtered page additionally emits a `MedicalCondition` ref under
// `about` and self-canonicals to /risk per the URL contract.

const RISK_TAGLINE =
  'Continental H3 hexagon heatmap of CDC-reported tick-borne disease ' +
  'cases. Bucketed into ~1,770 km² cells across the lower-48.'

export function buildRiskHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'Tick-borne disease risk map — Tickpedia',
    description: RISK_TAGLINE,
    canonicalPath: '/risk',
    jsonLd: [
      mapSchema(`${origin}/risk`, 'Tick-borne disease risk map'),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Risk map' },
        ],
        origin,
      ),
    ],
  }
}

export interface RiskDiseaseSeoInput {
  slug: string
  displayName: string
  oneLiner: string | null
}

export function buildRiskDiseaseHead(
  disease: RiskDiseaseSeoInput,
  origin = DEFAULT_ORIGIN,
): PageHead {
  const description = disease.oneLiner
    ? `${disease.displayName} risk map — ${disease.oneLiner}`
    : `${disease.displayName} risk map — H3 density of CDC-reported cases.`
  return {
    title: `${disease.displayName} risk map — Tickpedia`,
    description: truncate(description, 158),
    // Per §B0 + the URL contract, /risk/[slug] consolidates PageRank
    // back to the unfiltered /risk. The page still self-titles for
    // SERP relevance.
    canonicalPath: '/risk',
    jsonLd: [
      mapSchema(
        `${origin}/risk/${disease.slug}`,
        `${disease.displayName} risk map`,
        {
          about: {
            '@type': 'MedicalCondition',
            name: disease.displayName,
            url: `${origin}${pathFor('disease', { slug: disease.slug })}`,
          },
        },
      ),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Risk map', path: '/risk' },
          { label: disease.displayName },
        ],
        origin,
      ),
    ],
  }
}

interface MapAbout {
  '@type': 'MedicalCondition'
  name: string
  url: string
}

interface MapSchema {
  '@context': 'https://schema.org'
  '@type': 'Map'
  name: string
  url: string
  mapType: 'https://schema.org/VenueMap'
  about?: MapAbout
}

export function mapSchema(
  url: string,
  name: string,
  opts: { about?: MapAbout } = {},
): MapSchema {
  const out: MapSchema = {
    '@context': 'https://schema.org',
    '@type': 'Map',
    name,
    url,
    mapType: 'https://schema.org/VenueMap',
  }
  if (opts.about) out.about = opts.about
  return out
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cutoff = text.slice(0, max - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  return (lastSpace > 60 ? cutoff.slice(0, lastSpace) : cutoff) + '…'
}
