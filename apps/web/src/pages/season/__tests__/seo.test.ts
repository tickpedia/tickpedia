import { describe, it, expect } from 'vitest'
import { buildSeasonHead, webPageSchema } from '../seo.js'

function asArray(jsonLd: object | object[] | undefined): Array<Record<string, unknown>> {
  if (!jsonLd) return []
  return (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) as Array<Record<string, unknown>>
}

describe('buildSeasonHead', () => {
  it('canonicalizes to /season', () => {
    const head = buildSeasonHead()
    expect(head.canonicalPath).toBe('/season')
  })

  it('emits a WebPage schema (not Map, not MedicalCondition)', () => {
    const head = buildSeasonHead('https://tickpedia.test')
    const schemas = asArray(head.jsonLd)
    const types = schemas.map((s) => s['@type'])
    expect(types).toContain('WebPage')
    expect(types).not.toContain('Map')
    const webpage = schemas.find((s) => s['@type'] === 'WebPage') as
      | { url: string }
      | undefined
    expect(webpage!.url).toBe('https://tickpedia.test/season')
  })

  it('description fits the SERP snippet budget', () => {
    const head = buildSeasonHead()
    expect(head.description.length).toBeLessThanOrEqual(160)
  })
})

describe('webPageSchema', () => {
  it('names the page', () => {
    expect(webPageSchema('https://x/season').name).toBe('When is tick season?')
  })
})
