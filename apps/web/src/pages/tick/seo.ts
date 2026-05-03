import {
  type PageHead,
  breadcrumbListSchema,
  tickAnimalSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'
import { pathFor } from '../../routes/index.js'

// SEO surface for /ticks/[slug]. Same builder is used by:
//   - the prerender script (server) — full head injection at build time
//   - useDocumentHead (client)       — title / canonical / description
//                                      mutation on SPA navigation
//
// Returning a single `PageHead` keeps both call sites honest: if
// either drifts, the page's view-source and runtime tags drift apart.

export interface TickSeoInput {
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
}

const TICK_TAGLINE = 'Range, diseases, and removal — the field guide entry.'

const MAX_DESCRIPTION_LEN = 158

export function buildTickHead(tick: TickSeoInput, origin = DEFAULT_ORIGIN): PageHead {
  const canonicalPath = pathFor('tick', { slug: tick.slug })
  return {
    title: `${tick.commonName} — Ticks | Tickpedia`,
    description: truncateDescription(
      tick.oneLiner ?? `${tick.commonName} (${tick.scientificName}). ${TICK_TAGLINE}`,
    ),
    canonicalPath,
    jsonLd: [
      tickAnimalSchema(tick, origin),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Ticks', path: '/ticks' },
          { label: tick.commonName },
        ],
        origin,
      ),
    ],
  }
}

export function truncateDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LEN) return text
  // Trim at a word boundary to avoid mid-word cuts in social previews.
  const cutoff = text.slice(0, MAX_DESCRIPTION_LEN - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  return (lastSpace > 60 ? cutoff.slice(0, lastSpace) : cutoff) + '…'
}

export function buildTickRangeHead(tick: TickSeoInput, origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: `${tick.commonName} range — Ticks | Tickpedia`,
    description: truncateDescription(
      `Where ${tick.commonName} (${tick.scientificName}) is established. CDC-reported per-state county counts and the year-over-year footprint.`,
    ),
    canonicalPath: pathFor('tick-range', { slug: tick.slug }),
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Ticks', path: '/ticks' },
          { label: tick.commonName, path: pathFor('tick', { slug: tick.slug }) },
          { label: 'Range' },
        ],
        origin,
      ),
    ],
  }
}
