// Expand the URL contract against a live SemiLayer tenant. Both the
// build-time sitemap generator and the e2e smoke iterate the result —
// one to write `dist/sitemap.xml`, the other to assert every page's
// reads return data.
//
// Static patterns expand to one URL each. Parametric patterns query
// their `slugSource` lens for slugs and (for counties) the parent
// state slug. The full set is sorted by template + path for
// deterministic output.

import type { BeamClient } from '@semilayer/client'
import {
  URL_PATTERNS,
  pathFor,
  type EntityKind,
  type SlugSource,
  type UrlPattern,
} from './contract.js'

export interface CanonicalUrl {
  kind: EntityKind
  /** Concrete path, e.g. `/ticks/blacklegged-tick`. */
  path: string
  /** Pattern this URL was expanded from, e.g. `/ticks/:slug`. */
  template: string
  /** Entity slug for parametric URLs. */
  slug?: string
  /** Parent slug for nested URLs (the only one today is `/counties/:state/:slug`). */
  parentSlug?: string
}

export interface ListOptions {
  /**
   * Cap each parametric pattern at this many concrete URLs. The smoke
   * uses this to keep a 3,000+ URL set runnable in <60s. Unset = no cap
   * (the canonical spec + sitemap both use the full list).
   */
  sample?: number
}

interface SlugRow {
  slug: string
  /** Counties carry `stateFips` so we can join to the state slug. */
  stateFips?: string
}

const FETCH_LIMIT = 5000

export async function listCanonicalUrls(
  client: BeamClient,
  options: ListOptions = {},
): Promise<CanonicalUrl[]> {
  const slugCache = new Map<SlugSource, SlugRow[]>()
  const stateFipsToSlug = await loadStateFipsMap(client)

  const urls: CanonicalUrl[] = []
  for (const pattern of URL_PATTERNS) {
    if (pattern.slugSource === null) {
      urls.push({ kind: pattern.kind, path: pattern.path, template: pattern.path })
      continue
    }

    const rows = await loadSlugs(client, pattern.slugSource, slugCache)
    const trimmed = options.sample ? rows.slice(0, options.sample) : rows

    for (const row of trimmed) {
      urls.push(expandRow(pattern, row, stateFipsToSlug))
    }
  }

  return urls.sort((a, b) => a.template.localeCompare(b.template) || a.path.localeCompare(b.path))
}

/** All distinct page kinds with at least one URL. */
export function distinctKinds(urls: readonly CanonicalUrl[]): EntityKind[] {
  return [...new Set(urls.map((u) => u.kind))]
}

async function loadSlugs(
  client: BeamClient,
  source: Exclude<SlugSource, null>,
  cache: Map<SlugSource, SlugRow[]>,
): Promise<SlugRow[]> {
  const cached = cache.get(source)
  if (cached) return cached

  const fields = source === 'counties' ? ['slug', 'stateFips'] : ['slug']
  const { rows } = await client.query<SlugRow>(source, { fields, limit: FETCH_LIMIT })
  // Drop any slug-less rows defensively — a missing slug means the row
  // can't have a URL anyway.
  const clean = rows.filter((r) => typeof r.slug === 'string' && r.slug.length > 0)
  cache.set(source, clean)
  return clean
}

async function loadStateFipsMap(client: BeamClient): Promise<Map<string, string>> {
  const { rows } = await client.query<{ fips: string; slug: string }>('states', {
    fields: ['fips', 'slug'],
    limit: 100,
  })
  return new Map(rows.map((r) => [r.fips, r.slug]))
}

function expandRow(
  pattern: UrlPattern,
  row: SlugRow,
  stateFipsToSlug: Map<string, string>,
): CanonicalUrl {
  if (pattern.kind === 'county') {
    const stateSlug = row.stateFips ? stateFipsToSlug.get(row.stateFips) : undefined
    if (!stateSlug) {
      // No state means no URL — return a placeholder path so the smoke
      // surfaces this loudly. The shape ensures the failure is visible
      // ("path includes `unknown-state`") rather than a silent 404.
      return {
        kind: pattern.kind,
        path: `/counties/unknown-state/${row.slug}`,
        template: pattern.path,
        slug: row.slug,
        parentSlug: 'unknown-state',
      }
    }
    return {
      kind: pattern.kind,
      path: pathFor('county', { state: stateSlug, slug: row.slug }),
      template: pattern.path,
      slug: row.slug,
      parentSlug: stateSlug,
    }
  }

  return {
    kind: pattern.kind,
    path: pathFor(pattern.kind, { slug: row.slug }),
    template: pattern.path,
    slug: row.slug,
  }
}
