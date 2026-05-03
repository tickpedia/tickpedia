import { describe, it, expect } from 'vitest'
import { STATES_BY_USPS, stateNameFor, stateSlugFor } from '../states.js'
import { STATE_GRID } from '../state-grid.js'

describe('STATES_BY_USPS', () => {
  it('covers every state in STATE_GRID (50 + DC)', () => {
    for (const tile of STATE_GRID) {
      expect(STATES_BY_USPS[tile.code]).toBeDefined()
    }
    expect(Object.keys(STATES_BY_USPS).length).toBe(51)
  })

  it('uses lowercase hyphenated slugs for multi-word names', () => {
    expect(STATES_BY_USPS.NC?.slug).toBe('north-carolina')
    expect(STATES_BY_USPS.NY?.slug).toBe('new-york')
    expect(STATES_BY_USPS.WV?.slug).toBe('west-virginia')
    expect(STATES_BY_USPS.NH?.slug).toBe('new-hampshire')
    expect(STATES_BY_USPS.RI?.slug).toBe('rhode-island')
  })

  it('lowercases single-word names', () => {
    expect(STATES_BY_USPS.MA?.slug).toBe('massachusetts')
    expect(STATES_BY_USPS.ME?.slug).toBe('maine')
    expect(STATES_BY_USPS.CA?.slug).toBe('california')
  })

  it('keeps DC short (matches the alias map convention)', () => {
    expect(STATES_BY_USPS.DC?.slug).toBe('dc')
  })

  it('every entry round-trips its USPS code', () => {
    for (const [code, entry] of Object.entries(STATES_BY_USPS)) {
      expect(entry.code).toBe(code)
      expect(entry.slug).toMatch(/^[a-z-]+$/)
      expect(entry.name.length).toBeGreaterThan(0)
    }
  })
})

describe('stateNameFor / stateSlugFor', () => {
  it('returns the display name for a known code', () => {
    expect(stateNameFor('NC')).toBe('North Carolina')
    expect(stateNameFor('CA')).toBe('California')
  })

  it('falls back to the code itself when unknown', () => {
    expect(stateNameFor('XX')).toBe('XX')
  })

  it('returns the slug for a known code', () => {
    expect(stateSlugFor('NC')).toBe('north-carolina')
    expect(stateSlugFor('MA')).toBe('massachusetts')
  })

  it('returns null when the code is unknown', () => {
    expect(stateSlugFor('XX')).toBeNull()
  })
})
