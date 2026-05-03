import { describe, it, expect } from 'vitest'
import { parseLymeRows, type LymeRawRow } from '../ingest/lyme-county-import.js'

// Each row carries the full set of year columns (real CDC files have a
// consistent header across every row; the parser reads the year-bearing
// keys from row 0 once and applies them across the file).
const SAMPLE: LymeRawRow[] = [
  {
    Ctyname: 'Autauga County',
    stname: 'Alabama',
    ststatus: 'Low Incidence',
    stcode: 1,
    ctycode: 1,
    Cases2001: 0,
    Cases2002: 0,
    Cases2018: 2,
    Cases2019: 0,
    cases2021: 0,
    cases2022: 0,
    cases2023: 0,
  },
  {
    Ctyname: 'Baldwin County',
    stname: 'Alabama',
    ststatus: 'Low Incidence',
    stcode: 1,
    ctycode: 3,
    Cases2001: 0,
    Cases2002: 1,
    Cases2018: 2,
    Cases2019: 2,
    cases2021: 0,
    cases2022: 2,
    cases2023: 5,
  },
]

describe('parseLymeRows', () => {
  it('reconstructs a 5-char county FIPS from stcode + ctycode', () => {
    const { entries } = parseLymeRows(SAMPLE)
    const fipsSeen = new Set(entries.map((e) => e.fips))
    expect(fipsSeen.has('01001')).toBe(true)
    expect(fipsSeen.has('01003')).toBe(true)
  })

  it('emits one entry per non-zero, non-blank year cell', () => {
    const { entries } = parseLymeRows(SAMPLE)
    // Autauga: Cases2001=0 (kept — zero is meaningful), Cases2018=2, Cases2019=0, ...
    const autauga = entries.filter((e) => e.fips === '01001')
    expect(autauga).toHaveLength(7)
    const baldwin = entries.filter((e) => e.fips === '01003')
    expect(baldwin).toHaveLength(7)
  })

  it('parses each year column header into the canonical year', () => {
    const { entries } = parseLymeRows(SAMPLE)
    const years = new Set(entries.map((e) => e.year))
    expect(years.has(2001)).toBe(true)
    expect(years.has(2018)).toBe(true)
    expect(years.has(2023)).toBe(true)
  })

  it('handles mixed-case column names (Cases2018 + cases2022)', () => {
    const { entries } = parseLymeRows(SAMPLE)
    const baldwin2018 = entries.find((e) => e.fips === '01003' && e.year === 2018)
    const baldwin2022 = entries.find((e) => e.fips === '01003' && e.year === 2022)
    expect(baldwin2018?.count).toBe(2)
    expect(baldwin2022?.count).toBe(2)
  })

  it('skips suppressed CDC cells (* and <5)', () => {
    const { entries } = parseLymeRows([
      { ...SAMPLE[0]!, Cases2018: '*', Cases2019: '<5' },
    ])
    const autauga2018 = entries.find((e) => e.fips === '01001' && e.year === 2018)
    const autauga2019 = entries.find((e) => e.fips === '01001' && e.year === 2019)
    expect(autauga2018).toBeUndefined()
    expect(autauga2019).toBeUndefined()
  })

  it('parses comma-thousand counts', () => {
    const { entries } = parseLymeRows([
      { ...SAMPLE[0]!, Cases2018: '1,234' },
    ])
    expect(entries.find((e) => e.year === 2018)?.count).toBe(1234)
  })

  it('errors when no year-bearing columns are present', () => {
    const { entries, errors } = parseLymeRows([
      { Ctyname: 'X', stname: 'Y', stcode: 1, ctycode: 1 },
    ])
    expect(entries).toHaveLength(0)
    expect(errors[0]?.reason).toMatch(/Cases<YEAR>/)
  })

  it('errors on missing stcode or ctycode but keeps going', () => {
    const { entries, errors } = parseLymeRows([
      { ...SAMPLE[0]!, stcode: '' },
      SAMPLE[1]!,
    ])
    expect(errors[0]?.reason).toMatch(/Missing stcode/)
    expect(entries.find((e) => e.fips === '01003')).toBeDefined()
  })
})
