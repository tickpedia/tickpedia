// Map a canonical page path to its per-page OG image path.
//
// The build-time generator (`apps/web/scripts/og/generate-og.ts`)
// writes one PNG per canonical URL into `dist/og/<path>.png`. This
// helper is the single source of truth for that path mapping, used by
// both the writer (the generator) and the reader (`buildHeadHtml`,
// which falls back to `ogPathFor(canonicalPath)` when a builder
// doesn't set `ogImagePath` explicitly).
//
// The convention mirrors the URL contract verbatim:
//   /                              → /og/home.png
//   /ticks/lone-star-tick          → /og/ticks/lone-star-tick.png
//   /ticks/lone-star-tick/range    → /og/ticks/lone-star-tick/range.png
//   /counties/maine/cumberland     → /og/counties/maine/cumberland.png
//   /diseases/lyme-disease         → /og/diseases/lyme-disease.png
//
// Returning `null` means "no per-page OG — use the site default" (the
// caller decides what that is, typically `DEFAULT_OG_IMAGE_PATH`).

const VALID_SEGMENT = /^[a-z0-9][a-z0-9-]*$/i

/**
 * Compute the per-page OG image path for a canonical URL path.
 *
 * Returns `null` when the input is not a canonical-shaped path —
 * empty, missing leading slash, or containing a segment that wouldn't
 * survive a filesystem write (querystrings, hashes, trailing slashes,
 * dots, etc.). Callers fall back to the site default in that case.
 */
export function ogPathFor(canonicalPath: string): string | null {
  if (typeof canonicalPath !== 'string') return null
  if (canonicalPath.length === 0) return null
  if (!canonicalPath.startsWith('/')) return null
  if (canonicalPath.includes('?') || canonicalPath.includes('#')) return null

  if (canonicalPath === '/') return '/og/home.png'

  // Drop trailing slash defensively — the contract forbids them but
  // real-world links arrive with them.
  const trimmed = canonicalPath.replace(/\/+$/, '')
  const segments = trimmed.slice(1).split('/')
  if (segments.length === 0) return null

  for (const seg of segments) {
    if (!VALID_SEGMENT.test(seg)) return null
  }

  return `/og/${segments.join('/')}.png`
}
