import { describe, it, expect } from 'vitest'
import { pickPeakMonth } from '../useDiseaseSeasonality.js'

describe('pickPeakMonth', () => {
  it('returns null peak when the data is null or empty', () => {
    expect(pickPeakMonth(null)).toEqual({ month: null, monthName: null, count: 0 })
    expect(pickPeakMonth({ months: new Array(12).fill(0), total: 0 })).toEqual({
      month: null,
      monthName: null,
      count: 0,
    })
  })

  it('picks the month above 1.3× the average', () => {
    // July dominates; 350 vs avg ~46 → ratio ~7.6×.
    const months = [10, 10, 10, 10, 10, 120, 350, 80, 0, 0, 0, 0]
    const total = months.reduce((s, n) => s + n, 0)
    const peak = pickPeakMonth({ months, total })
    expect(peak.month).toBe(7)
    expect(peak.monthName).toBe('July')
    expect(peak.count).toBe(350)
  })

  it('returns null when the distribution is too flat', () => {
    // Roughly even — 100/100/100/... — no honest peak.
    const months = new Array(12).fill(100)
    const total = 1200
    const peak = pickPeakMonth({ months, total })
    expect(peak.month).toBeNull()
    expect(peak.monthName).toBeNull()
  })

  it('surfaces a peak well above 1.3× and hides one well below it', () => {
    // 1.5× — clearly above the threshold.
    const above = [100, 100, 100, 100, 100, 100, 150, 100, 100, 100, 100, 50]
    expect(pickPeakMonth({ months: above, total: above.reduce((s, n) => s + n, 0) }).month).toBe(7)
    // 1.1× — clearly below.
    const below = [100, 100, 100, 100, 100, 100, 110, 100, 100, 100, 100, 90]
    expect(pickPeakMonth({ months: below, total: below.reduce((s, n) => s + n, 0) }).month).toBeNull()
  })
})
