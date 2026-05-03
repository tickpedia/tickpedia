import { describe, it, expect } from 'vitest'
import { aggregateSeasonality } from '../aggregate.js'

describe('aggregateSeasonality', () => {
  it('returns a 12-element cumulative array even on empty input', () => {
    const out = aggregateSeasonality([])
    expect(out.cumulativeByMonth).toHaveLength(12)
    expect(out.cumulativeByMonth.every((n) => n === 0)).toBe(true)
    expect(out.perDisease).toEqual([])
  })

  it('sums month buckets across diseases', () => {
    const out = aggregateSeasonality([
      { dims: { month: 6, diseaseId: 1 }, measures: { total: 10 } },
      { dims: { month: 6, diseaseId: 2 }, measures: { total: 5 } },
      { dims: { month: 7, diseaseId: 1 }, measures: { total: 3 } },
    ])
    expect(out.cumulativeByMonth[5]).toBe(15) // June
    expect(out.cumulativeByMonth[6]).toBe(3) // July
  })

  it('finds each disease peak month (1-12)', () => {
    const out = aggregateSeasonality([
      { dims: { month: 4, diseaseId: 1 }, measures: { total: 1 } },
      { dims: { month: 6, diseaseId: 1 }, measures: { total: 9 } },
      { dims: { month: 9, diseaseId: 1 }, measures: { total: 4 } },
      { dims: { month: 10, diseaseId: 2 }, measures: { total: 7 } },
    ])
    const lyme = out.perDisease.find((d) => d.diseaseId === 1)
    expect(lyme?.peakMonth).toBe(6)
    expect(lyme?.total).toBe(14)
    const ana = out.perDisease.find((d) => d.diseaseId === 2)
    expect(ana?.peakMonth).toBe(10)
  })

  it('skips out-of-range months and non-numeric diseaseIds', () => {
    const out = aggregateSeasonality([
      { dims: { month: 13, diseaseId: 1 }, measures: { total: 100 } },
      { dims: { month: 0, diseaseId: 1 }, measures: { total: 100 } },
      { dims: { month: 6, diseaseId: 'bad' }, measures: { total: 100 } },
      { dims: { month: 6, diseaseId: 1 }, measures: { total: 1 } },
    ])
    expect(out.cumulativeByMonth[5]).toBe(1)
    expect(out.perDisease).toHaveLength(1)
  })

  it('reports peakMonth=0 when a disease has zero total', () => {
    const out = aggregateSeasonality([
      { dims: { month: 6, diseaseId: 1 }, measures: { total: 0 } },
    ])
    expect(out.perDisease[0]?.peakMonth).toBe(0)
  })
})
