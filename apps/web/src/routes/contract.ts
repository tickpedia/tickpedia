// The URL contract — every page tickpedia.com promises, in code.
//
// One row per (page kind, path template). The matching helpers
// (`match.ts`, `pathFor`) and the e2e fixtures derive everything they
// need from this table. Adding or removing a kind here should be the
// only place a URL change starts.
//
// Slug rules + alias-redirects live with their respective entities:
//   - aliases:   `apps/web/src/aliases.ts`
//   - slug rules: `plan/steps/05_design_handoff_and_urls.md` § B2
//
// `:slug` tokens map to entity slugs queried from SemiLayer at smoke
// time. `:state` is the state slug for nested county URLs (the only
// pattern with two parameters today).

export type EntityKind =
  // home + meta
  | 'home'
  | 'season'
  | 'risk'
  | 'risk-disease'
  | 'sources'
  | 'about'
  | 'contribute'
  | 'search'
  | 'not-found'
  // ticks
  | 'ticks-index'
  | 'tick'
  | 'tick-range'
  | 'tick-diseases'
  | 'tick-removal'
  // diseases
  | 'diseases-index'
  | 'disease'
  | 'disease-states'
  | 'disease-seasonality'
  | 'disease-ticks'
  | 'disease-history'
  // techniques
  | 'techniques-index'
  | 'technique'
  // states + counties
  | 'states-index'
  | 'state'
  | 'state-ticks'
  | 'state-diseases'
  | 'state-counties'
  | 'counties-leaderboard'
  | 'county'
  // facts
  | 'facts-index'
  | 'fact'

/** Source lens for a parametric pattern's slug expansion. `null` for static URLs. */
export type SlugSource =
  | 'ticks'
  | 'diseases'
  | 'removalTechniques'
  | 'states'
  | 'counties'
  | 'wildFacts'
  | null

export interface UrlPattern {
  kind: EntityKind
  /** Express-style template — `:slug`, optionally `:state` (nested counties). */
  path: string
  /** Lens whose `slug` column expands `:slug`. `null` for static URLs. */
  slugSource: SlugSource
}

export const URL_PATTERNS: readonly UrlPattern[] = [
  // Home + meta
  { kind: 'home',                 path: '/',                              slugSource: null },
  { kind: 'season',               path: '/season',                        slugSource: null },
  { kind: 'risk',                 path: '/risk',                          slugSource: null },
  { kind: 'risk-disease',         path: '/risk/:slug',                    slugSource: 'diseases' },
  { kind: 'sources',              path: '/sources',                       slugSource: null },
  { kind: 'about',                path: '/about',                         slugSource: null },
  { kind: 'contribute',           path: '/contribute',                    slugSource: null },
  { kind: 'search',               path: '/search',                        slugSource: null },
  { kind: 'not-found',            path: '/404',                           slugSource: null },

  // Ticks
  { kind: 'ticks-index',          path: '/ticks',                         slugSource: null },
  { kind: 'tick',                 path: '/ticks/:slug',                   slugSource: 'ticks' },
  { kind: 'tick-range',           path: '/ticks/:slug/range',             slugSource: 'ticks' },
  { kind: 'tick-diseases',        path: '/ticks/:slug/diseases',          slugSource: 'ticks' },
  { kind: 'tick-removal',         path: '/ticks/:slug/removal',           slugSource: 'ticks' },

  // Diseases
  { kind: 'diseases-index',       path: '/diseases',                      slugSource: null },
  { kind: 'disease',              path: '/diseases/:slug',                slugSource: 'diseases' },
  { kind: 'disease-states',       path: '/diseases/:slug/states',         slugSource: 'diseases' },
  { kind: 'disease-seasonality',  path: '/diseases/:slug/seasonality',    slugSource: 'diseases' },
  { kind: 'disease-ticks',        path: '/diseases/:slug/ticks',          slugSource: 'diseases' },
  { kind: 'disease-history',      path: '/diseases/:slug/history',        slugSource: 'diseases' },

  // Techniques
  { kind: 'techniques-index',     path: '/techniques',                    slugSource: null },
  { kind: 'technique',            path: '/techniques/:slug',              slugSource: 'removalTechniques' },

  // States + counties
  { kind: 'states-index',         path: '/states',                        slugSource: null },
  { kind: 'state',                path: '/states/:slug',                  slugSource: 'states' },
  { kind: 'state-ticks',          path: '/states/:slug/ticks',            slugSource: 'states' },
  { kind: 'state-diseases',       path: '/states/:slug/diseases',         slugSource: 'states' },
  { kind: 'state-counties',       path: '/states/:slug/counties',         slugSource: 'states' },
  { kind: 'counties-leaderboard', path: '/counties',                      slugSource: null },
  { kind: 'county',               path: '/counties/:state/:slug',         slugSource: 'counties' },

  // Facts
  { kind: 'facts-index',          path: '/facts',                         slugSource: null },
  { kind: 'fact',                 path: '/facts/:slug',                   slugSource: 'wildFacts' },
] as const

/** All `EntityKind`s the contract names. Useful for exhaustive-check tests. */
export const ALL_KINDS: readonly EntityKind[] = URL_PATTERNS.map((p) => p.kind)

/** Lookup pattern by kind. Throws on unknown kind — that's a bug, not a runtime concern. */
export function patternFor(kind: EntityKind): UrlPattern {
  const p = URL_PATTERNS.find((x) => x.kind === kind)
  if (!p) throw new Error(`unknown EntityKind: ${kind}`)
  return p
}

/**
 * Build a concrete URL from a kind + params.
 *
 *   pathFor('tick',  { slug: 'blacklegged-tick' })             // /ticks/blacklegged-tick
 *   pathFor('county', { state: 'maine', slug: 'cumberland' })  // /counties/maine/cumberland
 *
 * Throws if a `:token` in the template has no matching key in `params` —
 * silent dropouts produce 404s in production, which is the worst kind of
 * bug to ship.
 */
export function pathFor(
  kind: EntityKind,
  params: Readonly<Record<string, string>> = {},
): string {
  const tpl = patternFor(kind).path
  return tpl.replace(/:([a-zA-Z]+)/g, (_match, token: string) => {
    const v = params[token]
    if (!v) throw new Error(`pathFor(${kind}): missing param :${token} (template ${tpl})`)
    return v
  })
}
