import { describe, it, expect } from 'vitest'
import {
  buildStateHead,
  buildStateSubPageHead,
  buildStatesIndexHead,
  placeSchema,
  truncateDescription,
} from '../seo.js'

const MAINE = { fips: '23', code: 'ME', slug: 'maine', name: 'Maine' }

describe('buildStateHead', () => {
  it('builds the canonical title format', () => {
    const head = buildStateHead(MAINE)
    expect(head.title).toBe('Maine — States | Tickpedia')
  })

  it('points the canonical path at /states/[slug]', () => {
    const head = buildStateHead(MAINE)
    expect(head.canonicalPath).toBe('/states/maine')
  })

  it('emits Place + BreadcrumbList JSON-LD in that order', () => {
    const head = buildStateHead(MAINE)
    expect(Array.isArray(head.jsonLd)).toBe(true)
    const types = (head.jsonLd as Array<{ '@type': string }>).map((s) => s['@type'])
    expect(types).toEqual(['Place', 'BreadcrumbList'])
  })

  it('builds a 3-step BreadcrumbList ending at the state name', () => {
    const head = buildStateHead(MAINE)
    const crumbs = (head.jsonLd as Array<{ '@type': string }>).find(
      (s) => s['@type'] === 'BreadcrumbList',
    ) as
      | { itemListElement: Array<{ name: string; item?: string }> }
      | undefined
    expect(crumbs?.itemListElement).toHaveLength(3)
    expect(crumbs?.itemListElement[0]?.name).toBe('Tickpedia')
    expect(crumbs?.itemListElement[1]?.name).toBe('States')
    expect(crumbs?.itemListElement[2]?.name).toBe('Maine')
    expect(crumbs?.itemListElement[2]?.item).toBeUndefined()
  })
})

describe('buildStateSubPageHead', () => {
  it.each([
    ['Ticks', '/states/maine/ticks'],
    ['Diseases', '/states/maine/diseases'],
    ['Counties', '/states/maine/counties'],
  ] as const)('routes %s to %s', (section, path) => {
    const head = buildStateSubPageHead(MAINE, section)
    expect(head.canonicalPath).toBe(path)
    expect(head.title).toBe(`Maine — ${section} | Tickpedia`)
  })

  it('embeds a 4-step BreadcrumbList with the state linked', () => {
    const head = buildStateSubPageHead(MAINE, 'Ticks')
    const crumbs = (head.jsonLd as Array<{ '@type': string }>).find(
      (s) => s['@type'] === 'BreadcrumbList',
    ) as
      | { itemListElement: Array<{ name: string; item?: string }> }
      | undefined
    expect(crumbs?.itemListElement).toHaveLength(4)
    expect(crumbs?.itemListElement[2]?.name).toBe('Maine')
    expect(crumbs?.itemListElement[2]?.item).toBe('https://tickpedia.com/states/maine')
  })
})

describe('buildStatesIndexHead', () => {
  it('points at /states with an index title', () => {
    const head = buildStatesIndexHead()
    expect(head.canonicalPath).toBe('/states')
    expect(head.title).toBe('States — Tickpedia')
  })
})

describe('placeSchema', () => {
  it('emits the canonical Place shape with the URL and country', () => {
    const schema = placeSchema(MAINE, 'https://tickpedia.com')
    expect(schema['@type']).toBe('Place')
    expect(schema.name).toBe('Maine')
    expect(schema.url).toBe('https://tickpedia.com/states/maine')
    expect(schema.containedInPlace).toEqual({ '@type': 'Country', name: 'United States' })
  })

  it('carries the USPS code as alternateName', () => {
    const schema = placeSchema(MAINE, 'https://tickpedia.com')
    expect(schema.alternateName).toEqual(['ME'])
  })

  it('omits alternateName when code is empty', () => {
    const schema = placeSchema({ code: '', slug: 'x', name: 'X' }, 'https://tickpedia.com')
    expect(schema.alternateName).toBeUndefined()
  })
})

describe('truncateDescription', () => {
  it('passes short text through untouched', () => {
    expect(truncateDescription('short')).toBe('short')
  })

  it('truncates long text at a word boundary', () => {
    const long = 'word '.repeat(80)
    const out = truncateDescription(long)
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('…')).toBe(true)
  })
})
