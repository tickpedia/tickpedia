import { describe, it, expect } from 'vitest'
import { renderSvg } from '../render-png.js'
import { loadOgFonts, type OgFont } from '../load-fonts.js'
import { DefaultTemplate } from '../templates/default.js'
import { HomeTemplate } from '../templates/home.js'
import { TickTemplate, TickRangeTemplate } from '../templates/tick.js'
import { DiseaseTemplate } from '../templates/disease.js'
import { StateTemplate } from '../templates/state.js'
import { CountyTemplate } from '../templates/county.js'
import { TechniqueTemplate } from '../templates/technique.js'
import { FactTemplate } from '../templates/fact.js'
import { RiskTemplate } from '../templates/risk.js'
import { ListingTemplate } from '../templates/listing.js'

// Per-template smoke. Each template renders to a non-empty SVG, and
// the SVG carries the headline text the template was given. We don't
// snapshot the byte content because satori's output isn't byte-stable
// across versions, but the "title appears verbatim" assertion is
// enough to catch regressions like an unrendered prop.

let fontsP: Promise<OgFont[]> | null = null
function fonts(): Promise<OgFont[]> {
  if (!fontsP) fontsP = loadOgFonts()
  return fontsP
}

async function svg(element: ReturnType<typeof DefaultTemplate>) {
  // embedFont: false keeps text as `<text>` elements (instead of glyph
  // paths), so assertions can grep for the words the template was
  // given. This mode is test-only — the production renderer uses
  // embedFont: true so resvg can rasterise without system fonts.
  return renderSvg(element, { fonts: await fonts(), embedFont: false })
}

/** Pull all `<text>...</text>` element contents and join them. satori
 *  splits long strings into per-token `<text>` elements (one per
 *  word + space) for letter-spacing to work — assertions search the
 *  joined-back text rather than the raw SVG. */
function textOf(svgStr: string): string {
  const matches = [...svgStr.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
  return matches.map((m) => m[1]).join('')
}

describe('OG templates render expected content', () => {
  it('default template names Tickpedia + tagline', async () => {
    const text = textOf(await svg(DefaultTemplate({})))
    expect(text).toContain('Tickpedia')
    expect(text).toContain('Wild facts')
  }, 15000)

  it('home template carries the entity counts', async () => {
    const text = textOf(
      await svg(HomeTemplate({ tickCount: 17, diseaseCount: 65, stateCount: 50 })),
    )
    expect(text).toContain('17 species')
    expect(text).toContain('65 diseases')
    expect(text).toContain('50 states')
  }, 15000)

  it('tick template renders common name + scientific + chip', async () => {
    const text = textOf(
      await svg(
        TickTemplate({
          commonName: 'Lone star tick',
          scientificName: 'Amblyomma americanum',
          oneLiner: 'Aggressive biter; the alpha-gal vector.',
          family: 'Ixodidae',
          diseaseCount: 7,
          danger: 'high',
        }),
      ),
    )
    expect(text).toContain('Lone star tick')
    expect(text).toContain('Amblyomma americanum')
    expect(text).toContain('7 diseases')
    expect(text).toContain('High danger')
  }, 15000)

  it('tick range template carries county + state counts', async () => {
    const text = textOf(
      await svg(
        TickRangeTemplate({
          commonName: 'Lone star tick',
          scientificName: 'Amblyomma americanum',
          countyCount: 1070,
          stateCount: 34,
        }),
      ),
    )
    expect(text).toContain('Lone star tick range')
    expect(text).toContain('1,070 counties')
    expect(text).toContain('34 states')
  }, 15000)

  it('disease template renders display name + cases', async () => {
    const text = textOf(
      await svg(
        DiseaseTemplate({
          displayName: 'Lyme disease',
          oneLiner: 'A tick-borne bacterial infection.',
          primaryAlias: 'Borreliosis',
          totalCases: 63000,
          peakMonth: 'July',
        }),
      ),
    )
    expect(text).toContain('Lyme disease')
    expect(text).toContain('Borreliosis')
    expect(text).toContain('63,000 reported cases')
    expect(text).toContain('Peak · July')
  }, 15000)

  it('state template renders name + USPS code', async () => {
    const text = textOf(
      await svg(
        StateTemplate({
          name: 'Maine',
          code: 'ME',
          tickCount: 8,
          countyEstablished: 16,
          diseaseCount: 5,
        }),
      ),
    )
    expect(text).toContain('Maine')
    expect(text).toContain('ME')
    expect(text).toContain('STATE')
  }, 15000)

  it('county template renders county + parent state', async () => {
    const text = textOf(
      await svg(
        CountyTemplate({
          countyName: 'Cumberland County',
          parentStateName: 'Maine',
          tickCount: 2,
          diseaseCases: 14,
          population: 303000,
        }),
      ),
    )
    expect(text).toContain('Cumberland County')
    expect(text).toContain('Maine')
    expect(text).toContain('303k')
  }, 15000)

  it('technique template renders title + step labels', async () => {
    const text = textOf(
      await svg(
        TechniqueTemplate({
          title: 'Fine-tipped tweezers',
          oneLiner: 'The CDC-recommended removal tool.',
          steps: ['Grasp close to skin', 'Pull steady', 'Disinfect'],
          category: 'removal',
        }),
      ),
    )
    expect(text).toContain('Fine-tipped tweezers')
    expect(text).toContain('STEP 1')
    expect(text).toContain('Grasp close to skin')
  }, 15000)

  it('fact template renders body + citation host', async () => {
    const text = textOf(
      await svg(
        FactTemplate({
          body: 'Lyme transmission requires the tick to stay attached for 36–48 hours.',
          citationHost: 'cdc.gov',
        }),
      ),
    )
    expect(text).toContain('Lyme transmission requires')
    expect(text).toContain('cdc.gov')
  }, 15000)

  it('risk template carries optional disease label', async () => {
    const text = textOf(await svg(RiskTemplate({ diseaseLabel: 'Lyme disease' })))
    // The eyebrow is uppercase; the title preserves casing.
    expect(text).toContain('LYME DISEASE')
    expect(text).toContain('Lyme disease')
  }, 15000)

  it('listing template renders eyebrow + title', async () => {
    const text = textOf(
      await svg(
        ListingTemplate({
          eyebrow: 'WILD FACTS',
          title: 'Wild facts',
          description: 'Short, sourced facts about ticks.',
        }),
      ),
    )
    expect(text).toContain('WILD FACTS')
    expect(text).toContain('Wild facts')
  }, 15000)
})
