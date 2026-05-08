import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'

// SEO surface for /404. The same head also covers the unmatched-URL
// fallback rendered by App.tsx's RouteSwitch when no pattern matches —
// the canonical link points at /404 in both cases so search engines
// consolidate any indexed not-found URL onto a single noindex page.

export function buildNotFoundHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'Page not found — Tickpedia',
    description:
      "The URL isn't a route we recognize. Try the search, or head back to the encyclopedia.",
    canonicalPath: '/404',
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Not found' },
        ],
        origin,
      ),
    ],
  }
}
