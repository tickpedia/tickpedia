import { test, expect } from '@playwright/test'

// JSON-LD schema enforcement against the prerendered HTML. The page
// embeds one or more `<script type="application/ld+json">` blocks
// per Section B3 of the plan; tests parse the JSON and check the
// shape rather than string-matching.

test.describe('seo · JSON-LD on tick pages', () => {
  test('embeds Animal + BreadcrumbList for /ticks/[slug]', async ({ request }) => {
    const res = await request.get('/ticks/blacklegged-tick')
    expect(res.ok()).toBe(true)
    const body = await res.text()

    const schemas = extractJsonLd(body)
    expect(schemas.length).toBeGreaterThanOrEqual(2)

    const animal = schemas.find((s) => s['@type'] === 'Animal') as
      | { name: string; alternateName: string; url: string; parentTaxon: string; description?: string }
      | undefined
    expect(animal).toBeDefined()
    expect(animal?.name).toBe('Blacklegged tick')
    expect(animal?.alternateName).toBe('Ixodes scapularis')
    expect(animal?.url).toBe('https://tickpedia.com/ticks/blacklegged-tick')
    expect(animal?.parentTaxon).toBe('Ixodidae')

    const crumbs = schemas.find((s) => s['@type'] === 'BreadcrumbList') as
      | { itemListElement: Array<{ position: number; name: string; item?: string }> }
      | undefined
    expect(crumbs).toBeDefined()
    expect(crumbs?.itemListElement).toHaveLength(3)
    expect(crumbs?.itemListElement[0]?.name).toBe('Tickpedia')
    expect(crumbs?.itemListElement[2]?.name).toBe('Blacklegged tick')
    // Leaf crumb has no `item` (it's the current page).
    expect(crumbs?.itemListElement[2]?.item).toBeUndefined()
  })

  test('embeds BreadcrumbList for /ticks/[slug]/range with the parent linked', async ({ request }) => {
    const res = await request.get('/ticks/blacklegged-tick/range')
    expect(res.ok()).toBe(true)
    const body = await res.text()
    const schemas = extractJsonLd(body)
    const crumbs = schemas.find((s) => s['@type'] === 'BreadcrumbList') as
      | { itemListElement: Array<{ position: number; name: string; item?: string }> }
      | undefined
    expect(crumbs).toBeDefined()
    expect(crumbs?.itemListElement).toHaveLength(4)
    expect(crumbs?.itemListElement[2]?.name).toBe('Blacklegged tick')
    expect(crumbs?.itemListElement[2]?.item).toBe('https://tickpedia.com/ticks/blacklegged-tick')
    expect(crumbs?.itemListElement[3]?.name).toBe('Range')
  })

  test('every JSON-LD payload is valid JSON', async ({ request }) => {
    const res = await request.get('/ticks/lone-star-tick')
    const body = await res.text()
    const matches = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/g)]
    expect(matches.length).toBeGreaterThan(0)
    for (const m of matches) {
      expect(() => JSON.parse(m[1] ?? '')).not.toThrow()
    }
  })

  test('disease pages embed MedicalCondition + BreadcrumbList', async ({ request }) => {
    const res = await request.get('/diseases/lyme-disease')
    expect(res.ok()).toBe(true)
    const body = await res.text()

    const schemas = extractJsonLd(body)
    const medical = schemas.find((s) => s['@type'] === 'MedicalCondition') as
      | {
          name: string
          alternateName?: string[]
          url: string
          description?: string
          cause?: { '@type': string; name: string }
          epidemiology?: string
        }
      | undefined
    expect(medical).toBeDefined()
    expect(medical?.name).toBe('Lyme disease')
    expect(medical?.url).toBe('https://tickpedia.com/diseases/lyme-disease')

    const crumbs = schemas.find((s) => s['@type'] === 'BreadcrumbList') as
      | { itemListElement: Array<{ position: number; name: string; item?: string }> }
      | undefined
    expect(crumbs).toBeDefined()
    expect(crumbs?.itemListElement).toHaveLength(3)
    expect(crumbs?.itemListElement[1]?.name).toBe('Diseases')
    expect(crumbs?.itemListElement[2]?.name).toBe('Lyme disease')
  })
  test.skip('technique pages embed HowTo schema', async () => {
    /* phase 6 */
  })
  test.skip('county pages embed Place + geo block from county centroid', async () => {
    /* phase 8 */
  })
  test.skip('home embeds WebSite + SearchAction (Google sitelinks search box)', async () => {
    /* phase 10 */
  })
  test.skip('/risk + /risk/[slug] embed Map schema', async () => {
    /* phase 10 */
  })
})

interface JsonLdNode {
  '@type': string
  [key: string]: unknown
}

function extractJsonLd(html: string): JsonLdNode[] {
  const out: JsonLdNode[] = []
  const re = /<script type="application\/ld\+json">([\s\S]+?)<\/script>/g
  for (const m of html.matchAll(re)) {
    const json = m[1]
    if (!json) continue
    try {
      const parsed = JSON.parse(json) as JsonLdNode
      out.push(parsed)
    } catch {
      // Surface as a test failure via length / shape assertions in caller.
    }
  }
  return out
}
