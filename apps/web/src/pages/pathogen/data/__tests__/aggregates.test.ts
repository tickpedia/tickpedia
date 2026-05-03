import { describe, it, expect } from 'vitest'
import { aggregateCounties } from '../usePathogenCounties.js'
import { aggregateSpread } from '../usePathogenSpread.js'
import { composeIndexRows } from '../usePathogensIndex.js'
import { normalizePathogen } from '../normalize.js'

describe('aggregateCounties', () => {
  it('rolls up county presence per state with distinct counts', () => {
    const data = aggregateCounties([
      { countyFips: '23001', year: 2022 },
      { countyFips: '23001', year: 2023 }, // dupe county, different year
      { countyFips: '23005', year: 2023 },
      { countyFips: '36001', year: 2023 },
    ])
    expect(data.totalCounties).toBe(3)
    expect(data.stateCount).toBe(2)
    expect(data.byStateFips['23']).toBe(2)
    expect(data.byStateFips['36']).toBe(1)
    expect(data.latestYear).toBe(2023)
  })

  it('returns empty buckets for empty input', () => {
    const data = aggregateCounties([])
    expect(data.totalCounties).toBe(0)
    expect(data.stateCount).toBe(0)
    expect(data.latestYear).toBeNull()
  })

  it('skips rows with missing countyFips', () => {
    const data = aggregateCounties([
      { countyFips: '23001', year: 2023 },
      { countyFips: '', year: 2023 },
      { year: 2023 },
    ])
    expect(data.totalCounties).toBe(1)
  })
})

describe('aggregateSpread', () => {
  it('produces a cumulative county count per year', () => {
    const data = aggregateSpread([
      { countyFips: '23001', year: 2020 },
      { countyFips: '23005', year: 2021 },
      { countyFips: '23001', year: 2021 },
      { countyFips: '36001', year: 2022 },
    ])
    expect(data.rows).toEqual([
      { year: 2020, counties: 1 },
      { year: 2021, counties: 2 },
      { year: 2022, counties: 3 },
    ])
  })

  it('returns an empty rows array on empty input', () => {
    expect(aggregateSpread([])).toEqual({ rows: [] })
  })
})

describe('composeIndexRows', () => {
  it('joins pathogens with tick + disease counts and sorts by displayName', () => {
    const rows = composeIndexRows(
      [
        { id: 1, slug: 'b', displayName: 'Bravo', scientificName: 'B sp.', oneLiner: null },
        { id: 2, slug: 'a', displayName: 'Alpha', scientificName: 'A sp.', oneLiner: 'lede' },
      ],
      [{ dims: { pathogenId: 1 }, measures: { count: 3 } }],
      [{ dims: { pathogenId: 2 }, measures: { count: 7 } }],
    )
    expect(rows.map((r) => r.displayName)).toEqual(['Alpha', 'Bravo'])
    expect(rows[0]).toMatchObject({ tickCount: 0, diseaseCount: 7 })
    expect(rows[1]).toMatchObject({ tickCount: 3, diseaseCount: 0 })
  })
})

describe('normalizePathogen', () => {
  it('coerces missing fields to safe defaults', () => {
    const row = normalizePathogen({})
    expect(row).toEqual({
      id: 0,
      slug: '',
      displayName: '',
      scientificName: '',
      oneLiner: null,
      aliases: null,
    })
  })

  it('filters non-string aliases and drops empty arrays', () => {
    expect(normalizePathogen({ aliases: ['ok', 1, null, ''] }).aliases).toEqual(['ok'])
    expect(normalizePathogen({ aliases: [] }).aliases).toBeNull()
  })
})
