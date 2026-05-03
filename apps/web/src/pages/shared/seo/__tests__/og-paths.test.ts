import { describe, it, expect } from 'vitest'
import { ogPathFor } from '../og-paths.js'

describe('ogPathFor', () => {
  it('maps the home path to /og/home.png', () => {
    expect(ogPathFor('/')).toBe('/og/home.png')
  })

  it.each([
    ['/ticks',                       '/og/ticks.png'],
    ['/ticks/lone-star-tick',        '/og/ticks/lone-star-tick.png'],
    ['/ticks/lone-star-tick/range',  '/og/ticks/lone-star-tick/range.png'],
    ['/diseases/lyme-disease',       '/og/diseases/lyme-disease.png'],
    ['/states/maine',                '/og/states/maine.png'],
    ['/counties/maine/cumberland',   '/og/counties/maine/cumberland.png'],
    ['/techniques/fine-tipped-tweezers', '/og/techniques/fine-tipped-tweezers.png'],
    ['/facts/lyme-needs-attachment', '/og/facts/lyme-needs-attachment.png'],
    ['/risk',                        '/og/risk.png'],
    ['/risk/lyme-disease',           '/og/risk/lyme-disease.png'],
  ])('mirrors %s onto %s', (path, expected) => {
    expect(ogPathFor(path)).toBe(expected)
  })

  it('strips trailing slashes', () => {
    expect(ogPathFor('/ticks/lone-star-tick/')).toBe('/og/ticks/lone-star-tick.png')
  })

  it('returns null for paths that would not survive a filesystem write', () => {
    expect(ogPathFor('')).toBeNull()
    expect(ogPathFor('ticks/lone-star')).toBeNull()
    expect(ogPathFor('/ticks?x=1')).toBeNull()
    expect(ogPathFor('/ticks#anchor')).toBeNull()
    expect(ogPathFor('/ticks/lone-star.png')).toBeNull()
    expect(ogPathFor('/ticks//double-slash')).toBeNull()
    expect(ogPathFor('/ticks/-leading-dash')).toBeNull()
  })

  it('handles non-string inputs defensively', () => {
    expect(ogPathFor(null as unknown as string)).toBeNull()
    expect(ogPathFor(undefined as unknown as string)).toBeNull()
  })
})
