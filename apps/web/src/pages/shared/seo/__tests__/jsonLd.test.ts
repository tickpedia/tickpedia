import { describe, it, expect } from 'vitest'
import { breadcrumbListSchema, tickAnimalSchema } from '../jsonLd.js'

describe('breadcrumbListSchema', () => {
  it('emits one ListItem per crumb with 1-indexed positions', () => {
    const out = breadcrumbListSchema(
      [
        { label: 'Tickpedia', path: '/' },
        { label: 'Ticks', path: '/ticks' },
        { label: 'Lone star tick' },
      ],
      'https://tickpedia.com',
    )
    expect(out['@type']).toBe('BreadcrumbList')
    expect(out.itemListElement).toHaveLength(3)
    expect(out.itemListElement[0]?.position).toBe(1)
    expect(out.itemListElement[2]?.position).toBe(3)
  })

  it('absolute-resolves paths against the origin', () => {
    const out = breadcrumbListSchema(
      [{ label: 'Ticks', path: '/ticks' }],
      'https://tickpedia.com',
    )
    expect(out.itemListElement[0]?.item).toBe('https://tickpedia.com/ticks')
  })

  it('omits item URL on path-less leaf crumbs (the current page)', () => {
    const out = breadcrumbListSchema(
      [{ label: 'Lone star tick' }],
      'https://tickpedia.com',
    )
    expect(out.itemListElement[0]).not.toHaveProperty('item')
  })
})

describe('tickAnimalSchema', () => {
  it('produces an Animal node with the canonical url', () => {
    const out = tickAnimalSchema(
      {
        slug: 'lone-star-tick',
        commonName: 'Lone star tick',
        scientificName: 'Amblyomma americanum',
        oneLiner: 'Aggressive biter known for alpha-gal allergy.',
      },
      'https://tickpedia.com',
    )
    expect(out['@type']).toBe('Animal')
    expect(out.name).toBe('Lone star tick')
    expect(out.alternateName).toBe('Amblyomma americanum')
    expect(out.url).toBe('https://tickpedia.com/ticks/lone-star-tick')
    expect(out.description).toBe('Aggressive biter known for alpha-gal allergy.')
    expect(out.parentTaxon).toBe('Ixodidae')
    expect(out.taxonRank).toBe('species')
  })

  it('omits description when oneLiner is null/undefined', () => {
    const out = tickAnimalSchema(
      {
        slug: 'rare-tick',
        commonName: 'Rare tick',
        scientificName: 'Rarus rarus',
        oneLiner: null,
      },
      'https://tickpedia.com',
    )
    expect(out).not.toHaveProperty('description')
  })
})
