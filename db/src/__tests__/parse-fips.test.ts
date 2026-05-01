import { describe, it, expect } from 'vitest'
import { countySlug, parseFipsFile } from '../seeds/locations/parse-fips.js'

describe('countySlug', () => {
  it('strips " County"', () => {
    expect(countySlug('Autauga County')).toBe('autauga')
    expect(countySlug('St. Johns County')).toBe('st-johns')
  })

  it('strips " Parish" (Louisiana)', () => {
    expect(countySlug('Orleans Parish')).toBe('orleans')
  })

  it('strips " Borough" (Alaska)', () => {
    expect(countySlug('Aleutians East Borough')).toBe('aleutians-east')
    expect(countySlug('Anchorage Borough')).toBe('anchorage')
  })

  it('strips " City and Borough" before " Borough"', () => {
    expect(countySlug('Sitka City and Borough')).toBe('sitka')
    expect(countySlug('Juneau City and Borough')).toBe('juneau')
  })

  it('strips " Census Area"', () => {
    expect(countySlug('Yukon-Koyukuk Census Area')).toBe('yukon-koyukuk')
  })

  it('strips " Municipality"', () => {
    expect(countySlug('Anchorage Municipality')).toBe('anchorage')
  })

  it('preserves lowercase " city" (Virginia / MD independent cities)', () => {
    expect(countySlug('Baltimore city')).toBe('baltimore-city')
    expect(countySlug('Suffolk city')).toBe('suffolk-city')
    expect(countySlug('Virginia Beach city')).toBe('virginia-beach-city')
  })

  it('preserves capital " City" (Carson City)', () => {
    expect(countySlug('Carson City')).toBe('carson-city')
  })

  it('handles names with periods', () => {
    expect(countySlug('St. Croix County')).toBe('st-croix')
    expect(countySlug('DeKalb County')).toBe('dekalb')
  })
})

describe('parseFipsFile', () => {
  const minimal = `
Federal Information Processing System (FIPS) Codes for States and Counties

   state-level    place
    FIPS code     name
   -----------   -------
       01        ALABAMA
       02        ALASKA
       25        MASSACHUSETTS
       51        VIRGINIA


 county-level      place
  FIPS code        name
 ------------    --------------
    01000        Alabama
    01001        Autauga County
    02000        Alaska
    02013        Aleutians East Borough
    02068        Denali Borough                         (created after 1990)
    02220        Sitka Borough
    25000        Massachusetts
    25009        Essex County
    51000        Virginia
    51810        Virginia Beach city
`

  it('parses the states section', () => {
    const { states } = parseFipsFile(minimal)
    expect(states).toEqual([
      { fips: '01', rawName: 'ALABAMA' },
      { fips: '02', rawName: 'ALASKA' },
      { fips: '25', rawName: 'MASSACHUSETTS' },
      { fips: '51', rawName: 'VIRGINIA' },
    ])
  })

  it('skips state rollup rows (XX000)', () => {
    const { counties } = parseFipsFile(minimal)
    expect(counties.find((c) => c.fips === '01000')).toBeUndefined()
    expect(counties.find((c) => c.fips === '25000')).toBeUndefined()
  })

  it('strips trailing parenthesized notes', () => {
    const { counties } = parseFipsFile(minimal)
    const denali = counties.find((c) => c.fips === '02068')
    expect(denali?.countyName).toBe('Denali Borough')
    expect(denali?.slug).toBe('denali')
  })

  it('produces correct slugs', () => {
    const { counties } = parseFipsFile(minimal)
    expect(counties.find((c) => c.fips === '01001')?.slug).toBe('autauga')
    expect(counties.find((c) => c.fips === '25009')?.slug).toBe('essex')
    expect(counties.find((c) => c.fips === '51810')?.slug).toBe('virginia-beach-city')
    expect(counties.find((c) => c.fips === '02013')?.slug).toBe('aleutians-east')
  })

  it('preserves the leading zero in stateFips', () => {
    const { counties } = parseFipsFile(minimal)
    expect(counties.find((c) => c.fips === '01001')?.stateFips).toBe('01')
    expect(counties.find((c) => c.fips === '02013')?.stateFips).toBe('02')
  })
})
