import { describe, it, expect } from 'vitest'
import {
  filterRows,
  sortRows,
  summarizeDanger,
  type TicksIndexRow,
} from '../TicksIndexPage.js'

const make = (over: Partial<TicksIndexRow>): TicksIndexRow => ({
  id: 1,
  slug: 'foo',
  commonName: 'Foo tick',
  scientificName: 'Foo bar',
  oneLiner: null,
  heroHeadColor: null,
  heroBodyColor: null,
  heroLegColor: null,
  dangerLevel: 'unknown',
  counties: 0,
  ...over,
})

describe('filterRows', () => {
  const rows = [
    make({ id: 1, commonName: 'Blacklegged tick', scientificName: 'Ixodes scapularis' }),
    make({ id: 2, commonName: 'Lone star tick', scientificName: 'Amblyomma americanum' }),
    make({ id: 3, commonName: 'American dog tick', scientificName: 'Dermacentor variabilis' }),
  ]

  it('returns all rows for an empty query', () => {
    expect(filterRows(rows, '   ')).toHaveLength(3)
  })

  it('matches by common name', () => {
    expect(filterRows(rows, 'lone')).toHaveLength(1)
    expect(filterRows(rows, 'lone')[0]?.id).toBe(2)
  })

  it('matches by scientific name (case-insensitive)', () => {
    expect(filterRows(rows, 'IXODES')).toHaveLength(1)
    expect(filterRows(rows, 'IXODES')[0]?.id).toBe(1)
  })

  it('matches by one-liner content', () => {
    const withOneLiner = [...rows, make({ id: 4, oneLiner: 'A tiny midwest specialist' })]
    expect(filterRows(withOneLiner, 'midwest')).toHaveLength(1)
  })
})

describe('sortRows', () => {
  const rows = [
    make({ id: 1, commonName: 'Bravo', counties: 50, dangerLevel: 'low' }),
    make({ id: 2, commonName: 'Alpha', counties: 100, dangerLevel: 'high' }),
    make({ id: 3, commonName: 'Charlie', counties: 75, dangerLevel: 'moderate' }),
  ]

  it('sorts by name alphabetically', () => {
    expect(sortRows(rows, 'name').map((r) => r.id)).toEqual([2, 1, 3])
  })

  it('sorts by counties descending, name as tiebreaker', () => {
    expect(sortRows(rows, 'counties').map((r) => r.id)).toEqual([2, 3, 1])
  })

  it('sorts by danger high → low', () => {
    expect(sortRows(rows, 'danger').map((r) => r.id)).toEqual([2, 3, 1])
  })

  it('does not mutate the input', () => {
    const before = [...rows]
    sortRows(rows, 'counties')
    expect(rows).toEqual(before)
  })
})

describe('summarizeDanger', () => {
  it('returns counts in tier order: high, moderate, low, unknown', () => {
    const summary = summarizeDanger([
      make({ id: 1, dangerLevel: 'high', commonName: 'A' }),
      make({ id: 2, dangerLevel: 'high', commonName: 'B' }),
      make({ id: 3, dangerLevel: 'low', commonName: 'C' }),
      make({ id: 4, dangerLevel: 'unknown', commonName: 'D' }),
    ])
    expect(summary.map((s) => s.level)).toEqual(['high', 'moderate', 'low', 'unknown'])
    expect(summary.map((s) => s.count)).toEqual([2, 0, 1, 1])
  })

  it('alphabetises the sample within each tier', () => {
    const summary = summarizeDanger([
      make({ id: 1, dangerLevel: 'high', commonName: 'Charlie' }),
      make({ id: 2, dangerLevel: 'high', commonName: 'Alpha' }),
      make({ id: 3, dangerLevel: 'high', commonName: 'Bravo' }),
    ])
    const high = summary.find((s) => s.level === 'high')!
    expect(high.sample.map((r) => r.commonName)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })
})
