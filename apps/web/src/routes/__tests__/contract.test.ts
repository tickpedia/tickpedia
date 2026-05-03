import { describe, it, expect } from 'vitest'
import {
  URL_PATTERNS,
  ALL_KINDS,
  patternFor,
  pathFor,
  type EntityKind,
} from '../contract.js'

describe('URL_PATTERNS', () => {
  it('declares each EntityKind exactly once', () => {
    const seen = new Set<EntityKind>()
    for (const p of URL_PATTERNS) {
      expect(seen.has(p.kind), `duplicate kind ${p.kind}`).toBe(false)
      seen.add(p.kind)
    }
  })

  it('declares each path exactly once', () => {
    const seen = new Set<string>()
    for (const p of URL_PATTERNS) {
      expect(seen.has(p.path), `duplicate path ${p.path}`).toBe(false)
      seen.add(p.path)
    }
  })

  it('every path begins with `/`', () => {
    for (const p of URL_PATTERNS) {
      expect(p.path.startsWith('/'), `${p.kind}: ${p.path}`).toBe(true)
    }
  })

  it('static patterns have no `:tokens` and parametric ones do', () => {
    for (const p of URL_PATTERNS) {
      const hasToken = /:[a-zA-Z]+/.test(p.path)
      if (p.slugSource === null) {
        expect(hasToken, `${p.kind} declared static but path has a token`).toBe(false)
      } else {
        expect(hasToken, `${p.kind} declared parametric but path has no token`).toBe(true)
      }
    }
  })

  it('the `/counties/:state/:slug` nested pattern is the only two-token URL', () => {
    const twoToken = URL_PATTERNS.filter((p) => (p.path.match(/:[a-zA-Z]+/g) ?? []).length === 2)
    expect(twoToken).toHaveLength(1)
    expect(twoToken[0]!.kind).toBe('county')
  })

  it('ALL_KINDS contains every URL_PATTERNS kind, in order', () => {
    expect(ALL_KINDS).toEqual(URL_PATTERNS.map((p) => p.kind))
  })

  it('covers every URL listed in the contract (Section B1)', () => {
    // Verbatim from plan/steps/05_design_handoff_and_urls.md § B1.
    const expected = [
      '/',
      '/ticks',
      '/ticks/:slug',
      '/ticks/:slug/range',
      '/ticks/:slug/diseases',
      '/ticks/:slug/removal',
      '/diseases',
      '/diseases/:slug',
      '/diseases/:slug/states',
      '/diseases/:slug/seasonality',
      '/diseases/:slug/ticks',
      '/diseases/:slug/history',
      '/techniques',
      '/techniques/:slug',
      '/states',
      '/states/:slug',
      '/states/:slug/ticks',
      '/states/:slug/diseases',
      '/states/:slug/counties',
      '/counties',
      '/counties/:state/:slug',
      '/facts',
      '/facts/:slug',
      '/season',
      '/risk',
      '/risk/:slug',
      '/sources',
      '/about',
      '/contribute',
      '/search',
      '/404',
    ]
    const got = URL_PATTERNS.map((p) => p.path).sort()
    expect(got).toEqual([...expected].sort())
  })
})

describe('patternFor', () => {
  it('returns the matching pattern', () => {
    expect(patternFor('tick').path).toBe('/ticks/:slug')
    expect(patternFor('county').path).toBe('/counties/:state/:slug')
    expect(patternFor('home').path).toBe('/')
  })

  it('throws on an unknown kind', () => {
    expect(() => patternFor('nonsense' as EntityKind)).toThrow(/unknown EntityKind/)
  })
})

describe('pathFor', () => {
  it('substitutes a single :slug token', () => {
    expect(pathFor('tick', { slug: 'blacklegged-tick' })).toBe('/ticks/blacklegged-tick')
    expect(pathFor('disease-states', { slug: 'lyme-disease' })).toBe(
      '/diseases/lyme-disease/states',
    )
  })

  it('substitutes :state + :slug for the nested county URL', () => {
    expect(pathFor('county', { state: 'maine', slug: 'cumberland' })).toBe(
      '/counties/maine/cumberland',
    )
  })

  it('returns the static path verbatim for non-parametric kinds', () => {
    expect(pathFor('home')).toBe('/')
    expect(pathFor('risk')).toBe('/risk')
    expect(pathFor('not-found')).toBe('/404')
  })

  it('throws when a required param is missing — silent dropouts ship 404s to prod', () => {
    expect(() => pathFor('tick')).toThrow(/missing param :slug/)
    expect(() => pathFor('county', { state: 'maine' })).toThrow(/missing param :slug/)
    expect(() => pathFor('county', { slug: 'cumberland' })).toThrow(/missing param :state/)
  })
})
