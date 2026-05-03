// Path → matched route. Used by the client-side router shim and by
// the SEO specs that need "what kind is this URL?" without bringing in
// a heavyweight router dependency.
//
// The matcher runs against `URL_PATTERNS` in declaration order. Static
// patterns win over parametric ones because they appear first in the
// table (see `contract.ts`); we still rank static-first explicitly so
// reordering the table doesn't change the matcher's behaviour.

import {
  URL_PATTERNS,
  type EntityKind,
  type UrlPattern,
} from './contract.js'

export interface MatchedRoute {
  kind: EntityKind
  /** The pattern's template, e.g. `/ticks/:slug`. */
  template: string
  /** Extracted parameters, e.g. `{ slug: 'blacklegged-tick' }`. */
  params: Readonly<Record<string, string>>
}

/**
 * Match a pathname against the URL contract. Returns null if no
 * pattern matches. Trailing slashes are normalised away (the contract
 * forbids trailing slashes, but real-world links arrive with them).
 *
 * Querystrings are ignored — the contract identifies pages by path.
 */
export function matchRoute(rawPath: string): MatchedRoute | null {
  const path = normalisePath(rawPath)

  // Static-first ordering. Parametric patterns can also match the
  // static path (`/ticks/:slug` would match `/ticks` if `:slug` were
  // empty), so without this split we'd misclassify `/ticks` as a tick.
  const sortedStaticFirst = [
    ...URL_PATTERNS.filter((p) => p.slugSource === null),
    ...URL_PATTERNS.filter((p) => p.slugSource !== null),
  ]

  for (const pattern of sortedStaticFirst) {
    const params = matchPattern(pattern, path)
    if (params) return { kind: pattern.kind, template: pattern.path, params }
  }
  return null
}

function normalisePath(raw: string): string {
  // Drop querystring + hash; the contract is path-based.
  const noQuery = raw.split('?')[0]?.split('#')[0] ?? '/'
  // Drop trailing slash except for the root.
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1)
  return noQuery
}

function matchPattern(pattern: UrlPattern, path: string): Record<string, string> | null {
  const tplSegs = splitPath(pattern.path)
  const pathSegs = splitPath(path)
  if (tplSegs.length !== pathSegs.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < tplSegs.length; i++) {
    const t = tplSegs[i]!
    const p = pathSegs[i]!
    if (t.startsWith(':')) {
      // Parametric segments must be non-empty and must not contain a
      // slash (already guaranteed by splitPath) — empty matches would
      // happily turn `/ticks` into a tick page with slug `""`.
      if (p.length === 0) return null
      params[t.slice(1)] = p
    } else if (t !== p) {
      return null
    }
  }
  return params
}

function splitPath(s: string): string[] {
  if (s === '/') return ['']
  return s.replace(/^\//, '').split('/')
}
