import { describe, it, expect } from 'vitest'
import {
  buildTechniqueHead,
  buildTechniquesIndexHead,
  howToSchema,
  truncateDescription,
} from '../seo.js'

const FINE_TIPPED = {
  slug: 'fine-tipped-tweezers',
  title: 'Fine-tipped tweezers (CDC method)',
  oneLiner: 'The CDC-recommended primary method for tick removal.',
  steps: [
    '1. Use clean, fine-tipped tweezers to grasp the tick close to the skin.',
    '2. Pull upward with steady, even pressure.',
    '3. Clean the bite area with rubbing alcohol.',
    '4. Dispose of the tick.',
  ].join('\n'),
  sourceUrl: 'https://www.cdc.gov/ticks/removal/index.html',
}

describe('buildTechniqueHead', () => {
  it('builds the canonical title format', () => {
    const head = buildTechniqueHead(FINE_TIPPED)
    expect(head.title).toBe('Fine-tipped tweezers (CDC method) — Techniques | Tickpedia')
  })

  it('uses oneLiner verbatim as the description when present', () => {
    const head = buildTechniqueHead(FINE_TIPPED)
    expect(head.description).toBe(FINE_TIPPED.oneLiner)
  })

  it('falls back to the first step line when oneLiner is null', () => {
    const head = buildTechniqueHead({
      slug: 't',
      title: 'T',
      oneLiner: null,
      steps: '1. Wash hands first.\n2. Then do the thing.',
      sourceUrl: null,
    })
    expect(head.description).toContain('Wash hands first')
  })

  it('falls back to a templated description when both oneLiner and steps are null', () => {
    const head = buildTechniqueHead({
      slug: 't',
      title: 'T',
      oneLiner: null,
      steps: null,
      sourceUrl: null,
    })
    expect(head.description).toContain('T.')
    expect(head.description).toContain('removal or prevention technique')
  })

  it('points the canonical path at /techniques/[slug]', () => {
    const head = buildTechniqueHead(FINE_TIPPED)
    expect(head.canonicalPath).toBe('/techniques/fine-tipped-tweezers')
  })

  it('emits HowTo + BreadcrumbList JSON-LD in that order', () => {
    const head = buildTechniqueHead(FINE_TIPPED)
    expect(Array.isArray(head.jsonLd)).toBe(true)
    const types = (head.jsonLd as Array<{ '@type': string }>).map((s) => s['@type'])
    expect(types).toEqual(['HowTo', 'BreadcrumbList'])
  })

  it('builds a 3-step BreadcrumbList ending at the technique title', () => {
    const head = buildTechniqueHead(FINE_TIPPED)
    const crumbs = (head.jsonLd as Array<{ '@type': string }>).find(
      (s) => s['@type'] === 'BreadcrumbList',
    ) as
      | { itemListElement: Array<{ name: string; item?: string }> }
      | undefined
    expect(crumbs?.itemListElement).toHaveLength(3)
    expect(crumbs?.itemListElement[0]?.name).toBe('Tickpedia')
    expect(crumbs?.itemListElement[1]?.name).toBe('Techniques')
    expect(crumbs?.itemListElement[2]?.name).toBe('Fine-tipped tweezers (CDC method)')
    expect(crumbs?.itemListElement[2]?.item).toBeUndefined()
  })
})

describe('buildTechniquesIndexHead', () => {
  it('points at /techniques with an index title', () => {
    const head = buildTechniquesIndexHead()
    expect(head.canonicalPath).toBe('/techniques')
    expect(head.title).toBe('Techniques — Tickpedia')
  })

  it('embeds a 2-step BreadcrumbList', () => {
    const head = buildTechniquesIndexHead()
    const crumbs = (head.jsonLd as Array<{ '@type': string }>).find(
      (s) => s['@type'] === 'BreadcrumbList',
    ) as
      | { itemListElement: Array<{ name: string }> }
      | undefined
    expect(crumbs?.itemListElement).toHaveLength(2)
    expect(crumbs?.itemListElement[1]?.name).toBe('Techniques')
  })
})

describe('howToSchema', () => {
  it('emits one HowToStep per parsed step with monotonic positions', () => {
    const schema = howToSchema(FINE_TIPPED, 'https://tickpedia.com')
    expect(schema['@type']).toBe('HowTo')
    expect(schema.name).toBe('Fine-tipped tweezers (CDC method)')
    expect(schema.url).toBe('https://tickpedia.com/techniques/fine-tipped-tweezers')
    expect(schema.step).toHaveLength(4)
    expect(schema.step[0]?.position).toBe(1)
    expect(schema.step[3]?.position).toBe(4)
    expect(schema.step[0]?.text).toMatch(/^Use clean/)
  })

  it('attaches a HowToTool only on the fine-tipped-tweezers slug', () => {
    const schema = howToSchema(FINE_TIPPED, 'https://tickpedia.com')
    expect(schema.tool?.[0]?.name.toLowerCase()).toContain('tweezers')

    const other = howToSchema(
      { slug: 'permethrin', title: 'Permethrin', oneLiner: 'x', steps: '1. spray', sourceUrl: null },
      'https://tickpedia.com',
    )
    expect(other.tool).toBeUndefined()
  })

  it('falls back to a single step when the steps body has no parseable lines', () => {
    const schema = howToSchema(
      {
        slug: 't',
        title: 'T',
        oneLiner: null,
        steps: '   \n   ',
        sourceUrl: null,
      },
      'https://tickpedia.com',
    )
    expect(schema.step).toHaveLength(1)
    expect(schema.step[0]?.position).toBe(1)
  })

  it('drops `description` when neither oneLiner nor steps is present', () => {
    const schema = howToSchema(
      { slug: 't', title: 'T', oneLiner: null, steps: null, sourceUrl: null },
      'https://tickpedia.com',
    )
    expect(schema.description).toBeUndefined()
  })
})

describe('truncateDescription', () => {
  it('passes short text through untouched', () => {
    expect(truncateDescription('a short string')).toBe('a short string')
  })

  it('truncates long text at a word boundary', () => {
    const long = 'word '.repeat(80)
    const out = truncateDescription(long)
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('…')).toBe(true)
  })
})
