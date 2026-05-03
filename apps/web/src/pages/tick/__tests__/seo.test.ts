import { describe, it, expect } from 'vitest'
import { buildTickHead, truncateDescription } from '../seo.js'

describe('buildTickHead', () => {
  it('builds the canonical title format', () => {
    const head = buildTickHead({
      slug: 'lone-star-tick',
      commonName: 'Lone star tick',
      scientificName: 'Amblyomma americanum',
      oneLiner: 'Aggressive biter; the alpha-gal vector.',
    })
    expect(head.title).toBe('Lone star tick — Ticks | Tickpedia')
  })

  it('uses oneLiner verbatim as the description when present', () => {
    const head = buildTickHead({
      slug: 't',
      commonName: 'T',
      scientificName: 'Tt',
      oneLiner: 'A short one-liner.',
    })
    expect(head.description).toBe('A short one-liner.')
  })

  it('falls back to a templated description when oneLiner is null', () => {
    const head = buildTickHead({
      slug: 't',
      commonName: 'T',
      scientificName: 'Tt',
      oneLiner: null,
    })
    expect(head.description).toContain('T (Tt)')
    expect(head.description).toContain('Range, diseases, and removal')
  })

  it('points the canonical path at /ticks/[slug]', () => {
    const head = buildTickHead({
      slug: 'lone-star-tick',
      commonName: 'Lone star tick',
      scientificName: 'Amblyomma americanum',
      oneLiner: null,
    })
    expect(head.canonicalPath).toBe('/ticks/lone-star-tick')
  })

  it('emits Animal + BreadcrumbList JSON-LD', () => {
    const head = buildTickHead({
      slug: 'lone-star-tick',
      commonName: 'Lone star tick',
      scientificName: 'Amblyomma americanum',
      oneLiner: null,
    })
    expect(Array.isArray(head.jsonLd)).toBe(true)
    const types = (head.jsonLd as Array<{ '@type': string }>).map((s) => s['@type'])
    expect(types).toEqual(['Animal', 'BreadcrumbList'])
  })
})

describe('truncateDescription', () => {
  it('passes short text through untouched', () => {
    expect(truncateDescription('a short string')).toBe('a short string')
  })

  it('truncates long text at a word boundary', () => {
    const long = 'word '.repeat(80) // 400 chars
    const out = truncateDescription(long)
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/wor…$/) // didn't cut mid-word
  })
})
