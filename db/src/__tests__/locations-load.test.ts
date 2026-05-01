import { describe, it, expect } from 'vitest'
import { loadLocations } from '../seeds/locations/index.js'

describe('loadLocations (real FCC data)', () => {
  const { states, counties } = loadLocations()

  it('loads at least 50 states + DC', () => {
    expect(states.length).toBeGreaterThanOrEqual(51)
  })

  it('every state has a 2-char fips, USPS code, slug, and title-cased name', () => {
    for (const s of states) {
      expect(s.fips).toMatch(/^\d{2}$/)
      expect(s.code).toMatch(/^[A-Z]{2}$/)
      expect(s.slug).toBe(s.code.toLowerCase())
      expect(s.name.length).toBeGreaterThan(1)
      expect(s.name).not.toBe(s.name.toUpperCase()) // got title-cased
    }
  })

  it('includes Massachusetts with the right metadata', () => {
    const ma = states.find((s) => s.fips === '25')
    expect(ma).toEqual({ fips: '25', code: 'MA', slug: 'ma', name: 'Massachusetts' })
  })

  it('includes DC', () => {
    const dc = states.find((s) => s.fips === '11')
    expect(dc?.code).toBe('DC')
    expect(dc?.slug).toBe('dc')
  })

  it('loads thousands of counties (US has ~3,140)', () => {
    expect(counties.length).toBeGreaterThan(3000)
  })

  it('every county has a 5-char fips, a state, and a non-empty slug', () => {
    for (const c of counties) {
      expect(c.fips).toMatch(/^\d{5}$/)
      expect(c.stateFips).toBe(c.fips.slice(0, 2))
      expect(c.slug.length).toBeGreaterThan(0)
      expect(c.countyName.length).toBeGreaterThan(0)
    }
  })

  it('includes Essex County, MA at FIPS 25009 with slug "essex"', () => {
    const essex = counties.find((c) => c.fips === '25009')
    expect(essex?.slug).toBe('essex')
    expect(essex?.stateFips).toBe('25')
  })

  it('every county slug is unique within its state', () => {
    const byState = new Map<string, Set<string>>()
    for (const c of counties) {
      const set = byState.get(c.stateFips) ?? new Set<string>()
      expect(set.has(c.slug), `duplicate slug "${c.slug}" in state ${c.stateFips}`).toBe(false)
      set.add(c.slug)
      byState.set(c.stateFips, set)
    }
  })

  it('drops counties whose state has no USPS mapping (FK safety)', () => {
    const stateFipsSet = new Set(states.map((s) => s.fips))
    for (const c of counties) {
      expect(stateFipsSet.has(c.stateFips)).toBe(true)
    }
  })

  it('preserves leading zeros (Alabama is "01001", not "1001")', () => {
    const autauga = counties.find((c) => c.fips === '01001')
    expect(autauga).toBeDefined()
    expect(autauga?.slug).toBe('autauga')
  })
})
