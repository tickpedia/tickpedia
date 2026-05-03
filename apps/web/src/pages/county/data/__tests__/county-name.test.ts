import { describe, it, expect } from 'vitest'
import { formatCountyName } from '../county-name.js'

describe('formatCountyName', () => {
  it('appends " County" to a bare name', () => {
    expect(formatCountyName('Cumberland')).toBe('Cumberland County')
    expect(formatCountyName('York')).toBe('York County')
  })

  it('passes "County"-suffixed names through untouched', () => {
    expect(formatCountyName('Baltimore County')).toBe('Baltimore County')
  })

  it('passes "City"-suffixed names through untouched', () => {
    expect(formatCountyName('Baltimore City')).toBe('Baltimore City')
  })

  it('passes Louisiana parishes through untouched', () => {
    expect(formatCountyName('Acadia Parish')).toBe('Acadia Parish')
  })

  it('passes Alaska boroughs and census areas through untouched', () => {
    expect(formatCountyName('Aleutians East Borough')).toBe('Aleutians East Borough')
    expect(formatCountyName('Yukon-Koyukuk Census Area')).toBe('Yukon-Koyukuk Census Area')
  })

  it('handles empty input', () => {
    expect(formatCountyName('')).toBe('')
    expect(formatCountyName('   ')).toBe('')
  })

  it('is case-insensitive on the suffix match', () => {
    expect(formatCountyName('Baltimore COUNTY')).toBe('Baltimore COUNTY')
    expect(formatCountyName('baltimore city')).toBe('baltimore city')
  })
})
