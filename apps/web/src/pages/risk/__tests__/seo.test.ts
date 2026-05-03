import { describe, it, expect } from 'vitest'
import { buildRiskHead, buildRiskDiseaseHead, mapSchema } from '../seo.js'

function asArray(jsonLd: object | object[] | undefined): Array<Record<string, unknown>> {
  if (!jsonLd) return []
  return (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) as Array<Record<string, unknown>>
}

describe('buildRiskHead', () => {
  it('canonicalizes to /risk + emits a Map schema', () => {
    const head = buildRiskHead('https://tickpedia.test')
    expect(head.canonicalPath).toBe('/risk')
    const schemas = asArray(head.jsonLd)
    const map = schemas.find((s) => s['@type'] === 'Map')
    expect(map).toBeDefined()
    expect(map!.url).toBe('https://tickpedia.test/risk')
  })
})

describe('buildRiskDiseaseHead', () => {
  const lyme = {
    slug: 'lyme-disease',
    displayName: 'Lyme disease',
    oneLiner: 'Caused by the spirochete Borrelia burgdorferi.',
  }

  it('canonicalizes the disease-filtered map to /risk (consolidates PageRank)', () => {
    const head = buildRiskDiseaseHead(lyme)
    expect(head.canonicalPath).toBe('/risk')
  })

  it('self-titles for SERP relevance', () => {
    const head = buildRiskDiseaseHead(lyme)
    expect(head.title).toContain('Lyme disease')
  })

  it('emits a Map schema with a MedicalCondition `about`', () => {
    const head = buildRiskDiseaseHead(lyme, 'https://tickpedia.test')
    const schemas = asArray(head.jsonLd)
    const map = schemas.find((s) => s['@type'] === 'Map') as
      | { url: string; about: { '@type': string; name: string; url: string } }
      | undefined
    expect(map).toBeDefined()
    expect(map!.url).toBe('https://tickpedia.test/risk/lyme-disease')
    expect(map!.about['@type']).toBe('MedicalCondition')
    expect(map!.about.name).toBe('Lyme disease')
    expect(map!.about.url).toBe('https://tickpedia.test/diseases/lyme-disease')
  })

  it('truncates a long description to ≤158 chars', () => {
    const head = buildRiskDiseaseHead({
      ...lyme,
      oneLiner: 'A very long oneliner ' + 'lorem '.repeat(40),
    })
    expect(head.description.length).toBeLessThanOrEqual(158)
  })
})

describe('mapSchema', () => {
  it('omits `about` when not provided', () => {
    const m = mapSchema('https://tickpedia.test/risk', 'Risk map')
    expect(m).not.toHaveProperty('about')
    expect(m.mapType).toBe('https://schema.org/VenueMap')
  })
})
