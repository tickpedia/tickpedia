import { describe, it, expect } from 'vitest'
import { USPS_BY_FIPS, uspsForFips } from '../seeds/locations/usps-codes.js'

describe('USPS_BY_FIPS', () => {
  it('covers all 50 states + DC', () => {
    const expected = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
      'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
      'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
      'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
      'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI',
      'WY',
    ]
    const actual = new Set(Object.values(USPS_BY_FIPS))
    for (const code of expected) {
      expect(actual.has(code)).toBe(true)
    }
  })

  it('all keys are 2-char zero-padded FIPS', () => {
    for (const fips of Object.keys(USPS_BY_FIPS)) {
      expect(fips).toMatch(/^\d{2}$/)
    }
  })

  it('all values are 2-char uppercase codes', () => {
    for (const code of Object.values(USPS_BY_FIPS)) {
      expect(code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('codes are unique', () => {
    const codes = Object.values(USPS_BY_FIPS)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('uspsForFips resolves known and returns undefined for unknown', () => {
    expect(uspsForFips('25')).toBe('MA')
    expect(uspsForFips('99')).toBeUndefined()
  })
})
