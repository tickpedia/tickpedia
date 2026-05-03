import { describe, it, expect } from 'vitest'
import { ogPathFor } from '../../../src/pages/shared/seo/og-paths.js'
import { URL_PATTERNS } from '../../../src/routes/contract.js'

// Belt-and-braces sanity check: every URL_PATTERN in the contract
// resolves to a non-null OG path when expanded with a stand-in slug.
// This catches the case where someone adds a new pattern that
// includes a character class `ogPathFor` rejects (e.g. an extension
// suffix or a colon-prefixed token that wasn't substituted).

describe('every URL_PATTERN expands to a per-page OG path', () => {
  it.each(URL_PATTERNS.map((p) => [p.kind, p.path]))(
    '%s pattern %s maps to a per-page PNG',
    (_kind, template) => {
      const concrete = template
        .replace(':slug', 'sample-slug')
        .replace(':state', 'sample-state')
      const og = ogPathFor(concrete)
      expect(og).not.toBeNull()
      expect(og).toMatch(/^\/og(\/.+)?\.png$/)
    },
  )
})
