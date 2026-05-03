import { describe, it, expect } from 'vitest'
import {
  buildFactHead,
  buildFactsIndexHead,
  articleSchema,
  truncateDescription,
} from '../seo.js'

const SAMPLE = {
  slug: 'lyme-needs-36-48-hours-of-attachment',
  body:
    'CDC notes that the blacklegged tick generally must be attached for 36 to 48 hours ' +
    'before the Lyme disease bacterium can be transmitted to a person.',
  citationUrl: 'https://www.cdc.gov/lyme/transmission/',
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-04-10T00:00:00Z',
}

const REFS = {
  ticks: [
    {
      id: 1,
      slug: 'blacklegged-tick',
      commonName: 'Blacklegged tick',
      scientificName: 'Ixodes scapularis',
      oneLiner: 'Vector of Lyme.',
    },
  ],
  diseases: [
    {
      id: 10,
      slug: 'lyme-disease',
      displayName: 'Lyme disease',
      oneLiner: null,
    },
  ],
  techniques: [
    {
      id: 20,
      slug: 'fine-tipped-tweezers',
      title: 'Fine-tipped tweezers',
      oneLiner: null,
    },
  ],
}

describe('buildFactHead', () => {
  it('builds a humanized headline title', () => {
    const head = buildFactHead(SAMPLE)
    expect(head.title).toBe('Lyme Needs 36 48 Hours of Attachment — Wild facts | Tickpedia')
  })

  it('points the canonical at /facts/[slug]', () => {
    const head = buildFactHead(SAMPLE)
    expect(head.canonicalPath).toBe('/facts/lyme-needs-36-48-hours-of-attachment')
  })

  it('uses the body text (truncated) as the description', () => {
    const head = buildFactHead(SAMPLE)
    expect(head.description.length).toBeLessThanOrEqual(160)
    expect(head.description).toContain('blacklegged tick')
  })

  it('emits Article + ScholarlyArticle in the @type array', () => {
    const head = buildFactHead(SAMPLE, REFS)
    const article = (head.jsonLd as Array<{ '@type': string | string[] }>).find(
      (s) => Array.isArray(s['@type']) && s['@type'].includes('Article'),
    )
    expect(article).toBeDefined()
    expect((article as { '@type': string[] })['@type']).toEqual([
      'Article',
      'ScholarlyArticle',
    ])
  })

  it('emits a 3-step BreadcrumbList ending at the headline', () => {
    const head = buildFactHead(SAMPLE)
    const crumbs = (head.jsonLd as Array<{ '@type': string }>).find(
      (s) => s['@type'] === 'BreadcrumbList',
    ) as { itemListElement: Array<{ name: string; item?: string }> } | undefined
    expect(crumbs?.itemListElement).toHaveLength(3)
    expect(crumbs?.itemListElement[0]?.name).toBe('Tickpedia')
    expect(crumbs?.itemListElement[1]?.name).toBe('Wild facts')
    expect(crumbs?.itemListElement[2]?.name).toBe('Lyme Needs 36 48 Hours of Attachment')
    expect(crumbs?.itemListElement[2]?.item).toBeUndefined()
  })
})

describe('buildFactsIndexHead', () => {
  it('points at /facts with an index title', () => {
    const head = buildFactsIndexHead()
    expect(head.canonicalPath).toBe('/facts')
    expect(head.title).toBe('Wild facts — Tickpedia')
  })

  it('embeds a 2-step BreadcrumbList', () => {
    const head = buildFactsIndexHead()
    const crumbs = (head.jsonLd as Array<{ '@type': string }>).find(
      (s) => s['@type'] === 'BreadcrumbList',
    ) as { itemListElement: Array<{ name: string }> } | undefined
    expect(crumbs?.itemListElement).toHaveLength(2)
    expect(crumbs?.itemListElement[1]?.name).toBe('Wild facts')
  })
})

describe('articleSchema', () => {
  it('emits the canonical Article + ScholarlyArticle shape', () => {
    const schema = articleSchema(SAMPLE, REFS, 'https://tickpedia.com')
    expect(schema['@type']).toEqual(['Article', 'ScholarlyArticle'])
    expect(schema.headline).toContain('Lyme')
    expect(schema.url).toBe('https://tickpedia.com/facts/lyme-needs-36-48-hours-of-attachment')
    expect(schema.mainEntityOfPage).toBe(schema.url)
    expect(schema.articleBody).toBe(SAMPLE.body)
  })

  it('emits citation when citationUrl is set', () => {
    const schema = articleSchema(SAMPLE, REFS, 'https://tickpedia.com')
    expect(schema.citation).toEqual({
      '@type': 'CreativeWork',
      url: 'https://www.cdc.gov/lyme/transmission/',
    })
  })

  it('omits citation when citationUrl is null', () => {
    const schema = articleSchema(
      { ...SAMPLE, citationUrl: null },
      REFS,
      'https://tickpedia.com',
    )
    expect(schema.citation).toBeUndefined()
  })

  it('emits about[] for ticks/diseases/techniques refs', () => {
    const schema = articleSchema(SAMPLE, REFS, 'https://tickpedia.com')
    expect(schema.about).toBeDefined()
    expect(schema.about).toHaveLength(3)
    const aboutTypes = schema.about!.map((a) => a['@type'])
    expect(aboutTypes).toContain('Thing')
    expect(aboutTypes).toContain('MedicalCondition')
    expect(aboutTypes).toContain('HowTo')
  })

  it('omits about when refs are all empty', () => {
    const schema = articleSchema(
      SAMPLE,
      { ticks: [], diseases: [], techniques: [] },
      'https://tickpedia.com',
    )
    expect(schema.about).toBeUndefined()
  })

  it('carries datePublished + dateModified when present', () => {
    const schema = articleSchema(SAMPLE, REFS, 'https://tickpedia.com')
    expect(schema.datePublished).toBe(SAMPLE.createdAt)
    expect(schema.dateModified).toBe(SAMPLE.updatedAt)
  })
})

describe('truncateDescription', () => {
  it('passes short text through untouched', () => {
    expect(truncateDescription('hi')).toBe('hi')
  })

  it('truncates long text at a word boundary', () => {
    const long = 'word '.repeat(80)
    const out = truncateDescription(long)
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('…')).toBe(true)
  })
})
