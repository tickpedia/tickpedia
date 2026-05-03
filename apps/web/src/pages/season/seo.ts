import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'

// SEO surface for /season. Tick seasonality is not a Place or a
// MedicalCondition — `WebPage` is the honest schema. Plus a
// `BreadcrumbList`.

const SEASON_TAGLINE =
  'When is tick season? Reported cases peak in summer, but the curve ' +
  'isn’t the same for every disease. Monthly CDC counts, summed.'

export function buildSeasonHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'When is tick season? — Tickpedia',
    description: SEASON_TAGLINE,
    canonicalPath: '/season',
    jsonLd: [
      webPageSchema(`${origin}/season`),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Tick season' },
        ],
        origin,
      ),
    ],
  }
}

interface WebPageSchema {
  '@context': 'https://schema.org'
  '@type': 'WebPage'
  name: 'When is tick season?'
  url: string
  description: string
}

export function webPageSchema(url: string): WebPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'When is tick season?',
    url,
    description: SEASON_TAGLINE,
  }
}
