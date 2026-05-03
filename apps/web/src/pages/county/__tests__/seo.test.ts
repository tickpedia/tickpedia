import { describe, it, expect } from 'vitest'
import {
  buildCountyHead,
  buildCountiesLeaderboardHead,
  placeSchema,
  truncateDescription,
} from '../seo.js'

const CUMBERLAND = {
  fips: '23005',
  slug: 'cumberland',
  stateFips: '23',
  countyName: 'Cumberland',
  latitude: 43.94,
  longitude: -70.24,
}

const MAINE = {
  fips: '23',
  slug: 'maine',
  name: 'Maine',
  code: 'ME',
}

describe('buildCountyHead', () => {
  it('builds the canonical title with " County" suffix', () => {
    const head = buildCountyHead(CUMBERLAND, MAINE)
    expect(head.title).toBe('Cumberland County — Maine | Tickpedia')
  })

  it('points the canonical at /counties/[state]/[slug]', () => {
    const head = buildCountyHead(CUMBERLAND, MAINE)
    expect(head.canonicalPath).toBe('/counties/maine/cumberland')
  })

  it('emits Place + BreadcrumbList JSON-LD in that order', () => {
    const head = buildCountyHead(CUMBERLAND, MAINE)
    const types = (head.jsonLd as Array<{ '@type': string }>).map((s) => s['@type'])
    expect(types).toEqual(['Place', 'BreadcrumbList'])
  })

  it('builds a 5-step BreadcrumbList ending at the county name', () => {
    const head = buildCountyHead(CUMBERLAND, MAINE)
    const crumbs = (head.jsonLd as Array<{ '@type': string }>).find(
      (s) => s['@type'] === 'BreadcrumbList',
    ) as unknown as { itemListElement: Array<{ name: string; item?: string }> }
    expect(crumbs.itemListElement).toHaveLength(5)
    expect(crumbs.itemListElement[0]!.name).toBe('Tickpedia')
    expect(crumbs.itemListElement[1]!.name).toBe('States')
    expect(crumbs.itemListElement[2]!.name).toBe('Maine')
    expect(crumbs.itemListElement[2]!.item).toBe('https://tickpedia.com/states/maine')
    expect(crumbs.itemListElement[3]!.name).toBe('Counties')
    expect(crumbs.itemListElement[3]!.item).toBe('https://tickpedia.com/states/maine/counties')
    expect(crumbs.itemListElement[4]!.name).toBe('Cumberland County')
    expect(crumbs.itemListElement[4]!.item).toBeUndefined()
  })

  it('leaves "Baltimore City" alone (already suffixed)', () => {
    const head = buildCountyHead(
      { ...CUMBERLAND, slug: 'baltimore-city', countyName: 'Baltimore City' },
      MAINE,
    )
    expect(head.title).toBe('Baltimore City — Maine | Tickpedia')
  })
})

describe('buildCountiesLeaderboardHead', () => {
  it('points at /counties with a leaderboard title', () => {
    const head = buildCountiesLeaderboardHead()
    expect(head.canonicalPath).toBe('/counties')
    expect(head.title).toContain('top-100')
  })
})

describe('placeSchema', () => {
  it('emits the canonical Place shape with geo + containedInPlace', () => {
    const schema = placeSchema(CUMBERLAND, MAINE, 'https://tickpedia.com')
    expect(schema['@type']).toBe('Place')
    expect(schema.name).toBe('Cumberland County')
    expect(schema.url).toBe('https://tickpedia.com/counties/maine/cumberland')
    expect(schema.containedInPlace.name).toBe('Maine')
    expect(schema.containedInPlace.url).toBe('https://tickpedia.com/states/maine')
    expect(schema.containedInPlace.containedInPlace.name).toBe('United States')
    expect(schema.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 43.94,
      longitude: -70.24,
    })
  })

  it('omits geo when centroid is null', () => {
    const schema = placeSchema(
      { ...CUMBERLAND, latitude: null, longitude: null },
      MAINE,
      'https://tickpedia.com',
    )
    expect(schema.geo).toBeUndefined()
  })

  it('carries the FIPS as alternateName', () => {
    const schema = placeSchema(CUMBERLAND, MAINE, 'https://tickpedia.com')
    expect(schema.alternateName).toEqual(['23005'])
  })
})

describe('truncateDescription', () => {
  it('passes short text through untouched', () => {
    expect(truncateDescription('short')).toBe('short')
  })

  it('truncates long text at a word boundary with an ellipsis', () => {
    const long = 'word '.repeat(80)
    const out = truncateDescription(long)
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('…')).toBe(true)
  })
})
