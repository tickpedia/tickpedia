import { describe, it, expect } from 'vitest'
import { rowToLong } from '../ingest/cdc-county.js'

const sample = {
  State: 'Alabama',
  County: 'Autauga',
  FIPS: '01001',
  'Lyme disease': '1',
  Tularemia: '0',
  Babesiosis: '0',
  Anaplasmosis: '0',
  'Ehrlichia ewingii ehrlichiosis': '0',
  'Ehrlichia chaffeensis ehrlichiosis': '0',
  'Spotted fever rickettsiosis': '3',
  'Undetermined ehrlichiosis/ anaplasmosis': '0',
}

describe('rowToLong', () => {
  it('emits one row per disease column', () => {
    const out = rowToLong(sample, 2023)
    expect(out).toHaveLength(8)
  })

  it('preserves the leading zero in FIPS', () => {
    const out = rowToLong(sample, 2023)
    expect(out.every((r) => r.countyFips === '01001')).toBe(true)
    expect(out.every((r) => r.stateFips === '01')).toBe(true)
  })

  it('slugifies disease columns consistently', () => {
    const out = rowToLong(sample, 2023)
    const slugs = out.map((r) => r.diseaseSlug).sort()
    expect(slugs).toContain('lyme-disease')
    expect(slugs).toContain('spotted-fever-rickettsiosis')
    expect(slugs).toContain('undetermined-ehrlichiosis-anaplasmosis')
  })

  it('drops suppressed cells (* or <5) instead of storing zero', () => {
    const out = rowToLong({ ...sample, Babesiosis: '<5', Tularemia: '*' }, 2023)
    const babesiosis = out.find((r) => r.diseaseSlug === 'babesiosis')
    const tularemia = out.find((r) => r.diseaseSlug === 'tularemia')
    expect(babesiosis).toBeUndefined()
    expect(tularemia).toBeUndefined()
  })

  it('parses comma-thousand counts', () => {
    const out = rowToLong({ ...sample, 'Lyme disease': '1,234' }, 2023)
    const lyme = out.find((r) => r.diseaseSlug === 'lyme-disease')
    expect(lyme?.count).toBe(1234)
  })

  it('throws on a missing or malformed FIPS', () => {
    expect(() => rowToLong({ ...sample, FIPS: '' }, 2023)).toThrow(/FIPS/)
    expect(() => rowToLong({ ...sample, FIPS: 'XX' }, 2023)).toThrow(/FIPS/)
  })

  it('records the raw column name for traceability', () => {
    const out = rowToLong(sample, 2023)
    const sfr = out.find((r) => r.diseaseSlug === 'spotted-fever-rickettsiosis')
    expect(sfr?.rawDiseaseColumn).toBe('Spotted fever rickettsiosis')
  })
})
