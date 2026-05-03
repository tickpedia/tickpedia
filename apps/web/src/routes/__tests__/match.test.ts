import { describe, it, expect } from 'vitest'
import { matchRoute } from '../match.js'
import { URL_PATTERNS } from '../contract.js'

describe('matchRoute', () => {
  it('matches the root', () => {
    expect(matchRoute('/')).toEqual({ kind: 'home', template: '/', params: {} })
  })

  it('matches static index pages', () => {
    expect(matchRoute('/ticks')?.kind).toBe('ticks-index')
    expect(matchRoute('/diseases')?.kind).toBe('diseases-index')
    expect(matchRoute('/techniques')?.kind).toBe('techniques-index')
    expect(matchRoute('/states')?.kind).toBe('states-index')
    expect(matchRoute('/counties')?.kind).toBe('counties-leaderboard')
    expect(matchRoute('/facts')?.kind).toBe('facts-index')
  })

  it('matches static meta pages', () => {
    expect(matchRoute('/risk')?.kind).toBe('risk')
    expect(matchRoute('/season')?.kind).toBe('season')
    expect(matchRoute('/sources')?.kind).toBe('sources')
    expect(matchRoute('/about')?.kind).toBe('about')
    expect(matchRoute('/contribute')?.kind).toBe('contribute')
    expect(matchRoute('/search')?.kind).toBe('search')
    expect(matchRoute('/404')?.kind).toBe('not-found')
  })

  it('extracts :slug from a parametric path', () => {
    const m = matchRoute('/ticks/blacklegged-tick')
    expect(m).toEqual({
      kind: 'tick',
      template: '/ticks/:slug',
      params: { slug: 'blacklegged-tick' },
    })
  })

  it('extracts :slug from sub-pages', () => {
    expect(matchRoute('/ticks/blacklegged-tick/range')?.kind).toBe('tick-range')
    expect(matchRoute('/ticks/blacklegged-tick/diseases')?.kind).toBe('tick-diseases')
    expect(matchRoute('/ticks/blacklegged-tick/removal')?.kind).toBe('tick-removal')
    expect(matchRoute('/diseases/lyme-disease/seasonality')?.kind).toBe('disease-seasonality')
    expect(matchRoute('/states/maine/counties')?.kind).toBe('state-counties')
  })

  it('extracts :state + :slug from the nested county URL', () => {
    const m = matchRoute('/counties/maine/cumberland')
    expect(m).toEqual({
      kind: 'county',
      template: '/counties/:state/:slug',
      params: { state: 'maine', slug: 'cumberland' },
    })
  })

  it('matches `/risk/:slug` separately from `/risk`', () => {
    expect(matchRoute('/risk')?.kind).toBe('risk')
    expect(matchRoute('/risk/lyme-disease')?.kind).toBe('risk-disease')
  })

  it('strips a trailing slash before matching (the contract forbids them but links do arrive with them)', () => {
    expect(matchRoute('/ticks/')?.kind).toBe('ticks-index')
    expect(matchRoute('/ticks/blacklegged-tick/')?.kind).toBe('tick')
  })

  it('strips querystring + hash', () => {
    expect(matchRoute('/search?q=tick')?.kind).toBe('search')
    expect(matchRoute('/ticks/blacklegged-tick#diseases')?.kind).toBe('tick')
  })

  it('returns null for an unrecognised path', () => {
    expect(matchRoute('/nonsense')).toBeNull()
    expect(matchRoute('/ticks/blacklegged-tick/something-else')).toBeNull()
    expect(matchRoute('/counties/maine')).toBeNull() // the county pattern needs both segments
  })

  it('round-trips: every static pattern matches its own template path', () => {
    for (const p of URL_PATTERNS) {
      if (p.slugSource !== null) continue
      const m = matchRoute(p.path)
      expect(m?.kind, `${p.path}`).toBe(p.kind)
    }
  })
})
