import { describe, it, expect } from 'vitest'
import {
  buildDiseaseHead,
  buildDiseaseSubPageHead,
  buildDiseasesIndexHead,
  medicalConditionSchema,
  truncateDescription,
} from '../seo.js'

describe('buildDiseaseHead', () => {
  it('builds the canonical title format', () => {
    const head = buildDiseaseHead({
      slug: 'lyme-disease',
      displayName: 'Lyme disease',
      oneLiner: 'A bacterial infection from blacklegged ticks.',
      aliases: null,
    })
    expect(head.title).toBe('Lyme disease — Diseases | Tickpedia')
  })

  it('uses oneLiner verbatim as the description when present', () => {
    const head = buildDiseaseHead({
      slug: 'd',
      displayName: 'D',
      oneLiner: 'A short one-liner.',
      aliases: null,
    })
    expect(head.description).toBe('A short one-liner.')
  })

  it('falls back to a templated description when oneLiner is null', () => {
    const head = buildDiseaseHead({
      slug: 'd',
      displayName: 'D',
      oneLiner: null,
      aliases: null,
    })
    expect(head.description).toContain('D.')
    expect(head.description).toContain('tick-borne illness')
  })

  it('points the canonical path at /diseases/[slug]', () => {
    const head = buildDiseaseHead({
      slug: 'lyme-disease',
      displayName: 'Lyme disease',
      oneLiner: null,
      aliases: null,
    })
    expect(head.canonicalPath).toBe('/diseases/lyme-disease')
  })

  it('emits MedicalCondition + BreadcrumbList JSON-LD', () => {
    const head = buildDiseaseHead({
      slug: 'lyme-disease',
      displayName: 'Lyme disease',
      oneLiner: 'A bacterial infection.',
      aliases: ['borreliosis'],
    })
    expect(Array.isArray(head.jsonLd)).toBe(true)
    const types = (head.jsonLd as Array<{ '@type': string }>).map((s) => s['@type'])
    expect(types).toEqual(['MedicalCondition', 'BreadcrumbList'])
  })
})

describe('buildDiseaseSubPageHead', () => {
  const disease = {
    slug: 'lyme-disease',
    displayName: 'Lyme disease',
    oneLiner: null,
    aliases: null,
  }

  it.each([
    ['States', '/diseases/lyme-disease/states'],
    ['Seasonality', '/diseases/lyme-disease/seasonality'],
    ['Ticks', '/diseases/lyme-disease/ticks'],
    ['Pathogens', '/diseases/lyme-disease/pathogens'],
    ['History', '/diseases/lyme-disease/history'],
  ] as const)('routes %s to %s', (section, path) => {
    const head = buildDiseaseSubPageHead(disease, section)
    expect(head.canonicalPath).toBe(path)
    expect(head.title).toBe(`Lyme disease — ${section} | Tickpedia`)
  })

  it('embeds a 4-step BreadcrumbList with the disease linked', () => {
    const head = buildDiseaseSubPageHead(disease, 'States')
    const crumbs = (head.jsonLd as Array<{ '@type': string }>).find(
      (s) => s['@type'] === 'BreadcrumbList',
    ) as
      | { itemListElement: Array<{ name: string; item?: string }> }
      | undefined
    expect(crumbs?.itemListElement).toHaveLength(4)
    expect(crumbs?.itemListElement[2]?.name).toBe('Lyme disease')
    expect(crumbs?.itemListElement[2]?.item).toBe(
      'https://tickpedia.com/diseases/lyme-disease',
    )
  })
})

describe('buildDiseasesIndexHead', () => {
  it('points at /diseases with an index title', () => {
    const head = buildDiseasesIndexHead()
    expect(head.canonicalPath).toBe('/diseases')
    expect(head.title).toBe('Diseases — Tickpedia')
  })
})

describe('medicalConditionSchema', () => {
  it('drops `cause` when no pathogen is known', () => {
    const schema = medicalConditionSchema(
      { slug: 's', displayName: 'D', oneLiner: null, aliases: null },
      { totalCases: null, states: null, topPathogen: null, peakMonth: null },
      'https://tickpedia.com',
    )
    expect(schema.cause).toBeUndefined()
  })

  it('emits an alternateName array when aliases are present', () => {
    const schema = medicalConditionSchema(
      {
        slug: 'lyme-disease',
        displayName: 'Lyme disease',
        oneLiner: null,
        aliases: ['borreliosis', 'lyme borreliosis'],
      },
      { totalCases: null, states: null, topPathogen: null, peakMonth: null },
      'https://tickpedia.com',
    )
    expect(schema.alternateName).toEqual(['borreliosis', 'lyme borreliosis'])
  })

  it('builds a sentence-form epidemiology when stats are present', () => {
    const schema = medicalConditionSchema(
      { slug: 'd', displayName: 'D', oneLiner: null, aliases: null },
      { totalCases: 10000, states: 32, topPathogen: 'Borrelia burgdorferi', peakMonth: 'July' },
      'https://tickpedia.com',
    )
    expect(schema.cause).toEqual({ '@type': 'MedicalEntity', name: 'Borrelia burgdorferi' })
    expect(schema.epidemiology).toContain('10,000 reported cases')
    expect(schema.epidemiology).toContain('32 states')
    expect(schema.epidemiology).toContain('peak month July')
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
