import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'

// SEO surface for /search. The query value is intentionally NOT
// reflected in the canonical URL — the contract identifies the page by
// path, and querystring permutations should consolidate onto the bare
// /search URL for indexing purposes. The runtime title still reflects
// the query so the browser tab + tab-switcher list show what the user
// is searching.

export interface SearchHeadInput {
  /** Trimmed query string, or empty if the user hasn't typed yet. */
  query: string
}

export function buildSearchHead(
  input: SearchHeadInput,
  origin = DEFAULT_ORIGIN,
): PageHead {
  const q = input.query.trim()
  const title = q
    ? `Results for "${q}" — Search | Tickpedia`
    : 'Search — Tickpedia'
  const description = q
    ? `Search Tickpedia for "${q}" across ticks, diseases, removal techniques, states, and counties.`
    : 'Search Tickpedia across ticks, diseases, removal techniques, states, and counties.'

  return {
    title,
    description,
    canonicalPath: '/search',
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Search' },
        ],
        origin,
      ),
    ],
  }
}
