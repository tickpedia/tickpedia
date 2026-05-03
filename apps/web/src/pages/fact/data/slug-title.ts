// Pure helpers around the wild-fact slug. The slug is the de-facto
// title (a short kebab summary, ≤60 chars per §B2); the page hero,
// breadcrumbs, and JSON-LD all derive from it.

const ARTICLE_OR_PREP = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'and', 'or',
  'but', 'with', 'into', 'over', 'as', 'vs',
])

const SMALL_ACRONYMS = new Set(['cdc', 'rmsf', 'dna', 'rna', 'usa', 'ny', 'h3'])

/** kebab-slug → Title Case display string. First word always capitalized. */
export function titleizeSlug(slug: string): string {
  if (!slug) return ''
  const parts = slug.split(/-+/).filter(Boolean)
  if (parts.length === 0) return ''
  return parts
    .map((part, i) => {
      const lower = part.toLowerCase()
      if (SMALL_ACRONYMS.has(lower)) return lower.toUpperCase()
      if (i > 0 && ARTICLE_OR_PREP.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

/** Hostname extracted from a citation URL — for chip labels. Falls back to "source". */
export function citationHostname(rawUrl: string | null | undefined): string {
  if (!rawUrl) return 'source'
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return 'source'
  }
}

/** First N chars at a word boundary, ellipsised. Defensive on empty / null bodies. */
export function clampBody(body: string | null | undefined, max: number): string {
  if (!body) return ''
  const trimmed = body.trim()
  if (trimmed.length <= max) return trimmed
  const cutoff = trimmed.slice(0, max - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  return (lastSpace > Math.floor(max / 3) ? cutoff.slice(0, lastSpace) : cutoff) + '…'
}
