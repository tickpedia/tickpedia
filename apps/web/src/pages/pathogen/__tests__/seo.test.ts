import { describe, it, expect } from 'vitest'
import {
  buildPathogenHead,
  buildPathogenSubPageHead,
  buildPathogensIndexHead,
  taxonSchema,
  inferTaxonRank,
  inferParentGenus,
  truncateDescription,
} from '../seo.js'

import type { PathogenRow } from '../data/normalize.js'

const SAMPLE: PathogenRow = {
  id: 1,
  slug: 'borrelia-burgdorferi',
  displayName: 'Borrelia burgdorferi',
  scientificName: 'Borrelia burgdorferi sensu stricto',
  oneLiner: 'The spirochete that causes Lyme disease.',
  aliases: ['borreliosis-bacterium'],
}

describe('buildPathogenHead', () => {
  it('builds the canonical title format', () => {
    expect(buildPathogenHead(SAMPLE).title).toBe('Borrelia burgdorferi — Pathogens | Tickpedia')
  })

  it('uses oneLiner verbatim when present', () => {
    expect(buildPathogenHead(SAMPLE).description).toBe(SAMPLE.oneLiner)
  })

  it('points the canonical path at /pathogens/[slug]', () => {
    expect(buildPathogenHead(SAMPLE).canonicalPath).toBe('/pathogens/borrelia-burgdorferi')
  })

  it('emits Taxon + MedicalEntity + BreadcrumbList JSON-LD', () => {
    const head = buildPathogenHead(SAMPLE)
    const types = (head.jsonLd as Array<{ '@type': string }>).map((s) => s['@type'])
    expect(types).toEqual(['Taxon', 'MedicalEntity', 'BreadcrumbList'])
  })
})

describe('buildPathogenSubPageHead', () => {
  it.each([
    ['Range', '/pathogens/borrelia-burgdorferi/range'],
    ['Ticks', '/pathogens/borrelia-burgdorferi/ticks'],
    ['Diseases', '/pathogens/borrelia-burgdorferi/diseases'],
  ] as const)('routes %s to %s', (section, path) => {
    const head = buildPathogenSubPageHead(SAMPLE, section)
    expect(head.canonicalPath).toBe(path)
    expect(head.title).toBe(`Borrelia burgdorferi — ${section} | Tickpedia`)
  })

  it('embeds a 4-step BreadcrumbList with the pathogen linked', () => {
    const head = buildPathogenSubPageHead(SAMPLE, 'Range')
    const crumbs = (head.jsonLd as Array<{ '@type': string }>).find(
      (s) => s['@type'] === 'BreadcrumbList',
    ) as { itemListElement: Array<{ name: string; item?: string }> } | undefined
    expect(crumbs?.itemListElement).toHaveLength(4)
    expect(crumbs?.itemListElement[2]?.name).toBe('Borrelia burgdorferi')
    expect(crumbs?.itemListElement[2]?.item).toBe(
      'https://tickpedia.com/pathogens/borrelia-burgdorferi',
    )
  })
})

describe('buildPathogensIndexHead', () => {
  it('points at /pathogens with an index title', () => {
    const head = buildPathogensIndexHead()
    expect(head.canonicalPath).toBe('/pathogens')
    expect(head.title).toBe('Pathogens — Tickpedia')
  })
})

describe('taxonSchema', () => {
  it('emits taxonRank=species for binomial scientific names', () => {
    const schema = taxonSchema(SAMPLE, 'https://tickpedia.com')
    expect(schema.taxonRank).toBe('species')
  })

  it('emits parentTaxon for known genera', () => {
    const schema = taxonSchema(SAMPLE, 'https://tickpedia.com')
    expect(schema.parentTaxon).toEqual({ '@type': 'Taxon', name: 'Borrelia' })
  })

  it('omits parentTaxon for ambiguous taxonomy (Powassan virus)', () => {
    const schema = taxonSchema(
      {
        id: 9,
        slug: 'powassan-virus',
        displayName: 'Powassan virus',
        scientificName: 'Powassan virus',
        oneLiner: null,
        aliases: null,
      },
      'https://tickpedia.com',
    )
    expect(schema.parentTaxon).toBeUndefined()
  })

  it('merges aliases + scientificName into alternateName, de-duped', () => {
    const schema = taxonSchema(SAMPLE, 'https://tickpedia.com')
    expect(schema.alternateName).toEqual([
      'borreliosis-bacterium',
      'Borrelia burgdorferi sensu stricto',
    ])
  })
})

describe('inferTaxonRank', () => {
  it('returns species for any binomial-or-longer name', () => {
    expect(inferTaxonRank('Borrelia burgdorferi')).toBe('species')
    expect(inferTaxonRank('Ehrlichia muris eauclairensis')).toBe('species')
    expect(inferTaxonRank('Borrelia burgdorferi sensu stricto')).toBe('species')
    expect(inferTaxonRank('Powassan virus')).toBe('species')
  })

  it('returns null for single-word taxa', () => {
    expect(inferTaxonRank('Borrelia')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(inferTaxonRank('')).toBeNull()
  })
})

describe('inferParentGenus', () => {
  it('returns the genus when the binomial is in the known list', () => {
    expect(inferParentGenus('Borrelia mayonii')).toBe('Borrelia')
    expect(inferParentGenus('Anaplasma phagocytophilum')).toBe('Anaplasma')
  })

  it('returns null for unknown genera', () => {
    expect(inferParentGenus('Nonsensia fakespecies')).toBeNull()
    expect(inferParentGenus('Powassan virus')).toBeNull()
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
