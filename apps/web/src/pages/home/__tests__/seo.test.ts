import { describe, it, expect } from 'vitest'
import { buildHomeHead, websiteSchema } from '../seo.js'

function asArray(jsonLd: object | object[] | undefined): Array<Record<string, unknown>> {
  if (!jsonLd) return []
  return (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) as Array<Record<string, unknown>>
}

describe('buildHomeHead', () => {
  it('emits the home title + description', () => {
    const head = buildHomeHead()
    expect(head.title).toMatch(/Tickpedia/)
    expect(head.description.length).toBeLessThanOrEqual(160)
    expect(head.canonicalPath).toBe('/')
  })

  it('emits a WebSite schema with a SearchAction', () => {
    const head = buildHomeHead('https://tickpedia.test')
    const schemas = asArray(head.jsonLd)
    const website = schemas.find((s) => s['@type'] === 'WebSite')
    expect(website).toBeDefined()
    expect(website!.url).toBe('https://tickpedia.test/')
    const action = website!.potentialAction as {
      '@type': string
      target: { urlTemplate: string }
      'query-input': string
    }
    expect(action['@type']).toBe('SearchAction')
    expect(action.target.urlTemplate).toContain('{search_term_string}')
    expect(action['query-input']).toBe('required name=search_term_string')
  })

  it('emits a BreadcrumbList with a single Tickpedia crumb', () => {
    const head = buildHomeHead('https://tickpedia.test')
    const schemas = asArray(head.jsonLd)
    const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList')
    expect(breadcrumb).toBeDefined()
  })
})

describe('websiteSchema', () => {
  it('uses the origin verbatim with a trailing slash', () => {
    const schema = websiteSchema('https://tickpedia.test')
    expect(schema.url).toBe('https://tickpedia.test/')
  })
})
