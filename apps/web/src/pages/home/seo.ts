import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'

// SEO surface for the home page (/). Per step 05 §B3 emits
// `WebSite` + `SearchAction` (Google sitelinks search box) plus a
// `BreadcrumbList`.
//
// The `SearchAction` target is `/search?q={search_term_string}` per
// Google's spec — even though `/search` itself ships in phase 12, the
// schema is forever and the SPA fallback already 200s the URL.

const HOME_TAGLINE =
  'Ticks, the diseases they carry, and the data behind every claim. ' +
  'A public-good encyclopedia — MIT-licensed, sources cited.'

export function buildHomeHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'Tickpedia — ticks, the diseases they carry, and the data behind every claim',
    description: HOME_TAGLINE,
    canonicalPath: '/',
    jsonLd: [
      websiteSchema(origin),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia' },
        ],
        origin,
      ),
    ],
  }
}

interface WebsiteSchema {
  '@context': 'https://schema.org'
  '@type': 'WebSite'
  name: 'Tickpedia'
  url: string
  description: string
  potentialAction: {
    '@type': 'SearchAction'
    target: { '@type': 'EntryPoint'; urlTemplate: string }
    'query-input': 'required name=search_term_string'
  }
}

export function websiteSchema(origin: string): WebsiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Tickpedia',
    url: `${origin}/`,
    description: HOME_TAGLINE,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}
