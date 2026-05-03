import { describe, it, expect } from 'vitest'
import {
  prevalenceFromCounties,
  prevalenceRank,
  readEstablishedBuckets,
  rollupStateTicks,
} from '../state-ticks-rollup.js'

describe('readEstablishedBuckets', () => {
  it('coerces tickId to number, stateFips to string, drops empty rows', () => {
    const out = readEstablishedBuckets({
      buckets: [
        { dims: { tickId: 1, stateFips: '23' }, measures: { counties: 14 } },
        { dims: { tickId: '2', stateFips: 23 }, measures: { counties: 5 } },
        // counties=0 → dropped
        { dims: { tickId: 3, stateFips: '23' }, measures: { counties: 0 } },
        // missing stateFips → dropped
        { dims: { tickId: 4, stateFips: null }, measures: { counties: 9 } },
        // non-numeric tickId → dropped
        { dims: { tickId: 'x', stateFips: '23' }, measures: { counties: 1 } },
      ],
    })
    expect(out).toEqual([
      { tickId: 1, stateFips: '23', counties: 14 },
      { tickId: 2, stateFips: '23', counties: 5 },
    ])
  })
})

describe('rollupStateTicks', () => {
  const ticks = [
    { id: 1, slug: 'blacklegged-tick', commonName: 'Blacklegged tick', scientificName: 'Ixodes scapularis', oneLiner: 'Vector of Lyme.' },
    { id: 2, slug: 'american-dog-tick', commonName: 'American dog tick', scientificName: 'Dermacentor variabilis', oneLiner: null },
    { id: 99, slug: 'lone-star-tick', commonName: 'Lone star tick', scientificName: 'Amblyomma americanum', oneLiner: null },
  ]

  it('filters to the given state and joins to the ticks lens', () => {
    const rows = rollupStateTicks(
      '23',
      [
        { tickId: 1, stateFips: '23', counties: 14 },
        { tickId: 2, stateFips: '23', counties: 5 },
        // a different state — must be excluded
        { tickId: 99, stateFips: '36', counties: 30 },
      ],
      ticks,
    )
    expect(rows.map((r) => r.slug)).toEqual(['blacklegged-tick', 'american-dog-tick'])
  })

  it('derives prevalence from the established-county count', () => {
    const rows = rollupStateTicks(
      '23',
      [
        { tickId: 1, stateFips: '23', counties: 30 }, // high
        { tickId: 2, stateFips: '23', counties: 14 }, // moderate
        { tickId: 99, stateFips: '23', counties: 5 }, // low
      ],
      ticks,
    )
    const byId = new Map(rows.map((r) => [r.id, r]))
    expect(byId.get(1)?.prevalence).toBe('high')
    expect(byId.get(2)?.prevalence).toBe('moderate')
    expect(byId.get(99)?.prevalence).toBe('low')
  })

  it('sorts high-first, then by county count, then alpha', () => {
    const rows = rollupStateTicks(
      '23',
      [
        { tickId: 1, stateFips: '23', counties: 14 },
        { tickId: 2, stateFips: '23', counties: 30 },
        { tickId: 99, stateFips: '23', counties: 5 },
      ],
      ticks,
    )
    expect(rows.map((r) => r.id)).toEqual([2, 1, 99])
  })

  it('sums county counts when the same (tickId, stateFips) appears in multiple buckets', () => {
    const rows = rollupStateTicks(
      '23',
      [
        { tickId: 1, stateFips: '23', counties: 7 },
        { tickId: 1, stateFips: '23', counties: 6 },
      ],
      ticks,
    )
    expect(rows[0]?.establishedCounties).toBe(13)
  })
})

describe('prevalenceFromCounties', () => {
  it('uses the documented thresholds', () => {
    expect(prevalenceFromCounties(0)).toBeNull()
    expect(prevalenceFromCounties(1)).toBe('low')
    expect(prevalenceFromCounties(9)).toBe('low')
    expect(prevalenceFromCounties(10)).toBe('moderate')
    expect(prevalenceFromCounties(29)).toBe('moderate')
    expect(prevalenceFromCounties(30)).toBe('high')
  })
})

describe('prevalenceRank', () => {
  it('orders high > moderate > low > null', () => {
    expect(prevalenceRank('high')).toBeGreaterThan(prevalenceRank('moderate'))
    expect(prevalenceRank('moderate')).toBeGreaterThan(prevalenceRank('low'))
    expect(prevalenceRank('low')).toBeGreaterThan(prevalenceRank(null))
  })
})
