import { describe, it, expect } from 'vitest'
import { DATA_RAMP, rampIndex, rampFill } from '../ramp.js'

describe('DATA_RAMP', () => {
  it('has six steps from d0 to d5', () => {
    expect(DATA_RAMP).toEqual([
      'var(--d0)', 'var(--d1)', 'var(--d2)', 'var(--d3)', 'var(--d4)', 'var(--d5)',
    ])
  })
})

describe('rampIndex', () => {
  it('returns -1 for values at or below the threshold', () => {
    expect(rampIndex(0)).toBe(-1)
    expect(rampIndex(-0.5)).toBe(-1)
    expect(rampIndex(0.04, 6, 0.05)).toBe(-1)
  })

  it('maps 0..1 evenly across the ramp', () => {
    expect(rampIndex(0.01)).toBe(0)
    expect(rampIndex(0.2)).toBe(1)
    expect(rampIndex(0.5)).toBe(3)
    expect(rampIndex(0.99)).toBe(5)
  })

  it('caps at the last index for normalized=1', () => {
    expect(rampIndex(1)).toBe(5)
    expect(rampIndex(2)).toBe(5)
  })
})

describe('rampFill', () => {
  it('returns null when max is zero or negative', () => {
    expect(rampFill(5, 0)).toBeNull()
    expect(rampFill(5, -1)).toBeNull()
  })

  it('returns null for absent (zero) values', () => {
    expect(rampFill(0, 100)).toBeNull()
  })

  it('picks the lowest bucket for small positive values', () => {
    expect(rampFill(1, 100)).toBe('var(--d0)')
  })

  it('picks the highest bucket for max-equal values', () => {
    expect(rampFill(100, 100)).toBe('var(--d5)')
  })

  it('respects a custom ramp', () => {
    const ramp = ['#fff', '#000']
    expect(rampFill(50, 100, ramp)).toBe('#000')
  })
})
