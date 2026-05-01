import { describe, it, expect } from 'vitest'
import { CANONICAL_DISEASES } from '../seeds/diseases.js'
import { slugify } from '../normalize.js'

describe('canonical disease list', () => {
  it('every slug is unique', () => {
    const slugs = CANONICAL_DISEASES.map((d) => d.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every alias is already slugified (no spaces, no caps)', () => {
    for (const d of CANONICAL_DISEASES) {
      for (const alias of d.aliases) {
        expect(alias).toBe(slugify(alias))
      }
    }
  })

  it('the canonical slug is included in its own alias list', () => {
    for (const d of CANONICAL_DISEASES) {
      expect(d.aliases).toContain(d.slug)
    }
  })

  it('every column header in the CDC sample resolves via aliases', () => {
    // The wide-format sample the user shared. If a header doesn't slugify
    // to a known alias, ingest will create an orphan slug and the public
    // site will show "Unknown disease". Catch that here.
    const cdcColumns = [
      'Lyme disease',
      'Tularemia',
      'Babesiosis',
      'Anaplasmosis',
      'Ehrlichia ewingii ehrlichiosis',
      'Ehrlichia chaffeensis ehrlichiosis',
      'Spotted fever rickettsiosis',
      'Undetermined ehrlichiosis/ anaplasmosis',
    ]
    const aliasIndex = new Set(CANONICAL_DISEASES.flatMap((d) => d.aliases))

    for (const col of cdcColumns) {
      expect(aliasIndex.has(slugify(col))).toBe(true)
    }
  })
})
