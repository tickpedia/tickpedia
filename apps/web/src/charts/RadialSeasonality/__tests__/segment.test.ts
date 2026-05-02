import { describe, it, expect } from 'vitest'
import { segmentPath, labelPosition } from '../segment.js'

describe('segmentPath', () => {
  it('returns an M…L…L…L…Z quad', () => {
    const d = segmentPath({ monthIndex: 0, cx: 50, cy: 50, innerR: 10, outerR: 20, value: 5, max: 10 })
    expect(d).toMatch(/^M /)
    expect(d.match(/ L /g)?.length).toBe(3)
    expect(d.endsWith(' Z')).toBe(true)
  })

  it('produces a zero-width-radius wedge when value is zero', () => {
    const dZero = segmentPath({ monthIndex: 0, cx: 50, cy: 50, innerR: 10, outerR: 20, value: 0, max: 10 })
    // Outer points should equal inner points (r === innerR)
    const nums = dZero.match(/-?\d+(?:\.\d+)?/g)!.map(parseFloat)
    expect(nums[0]).toBeCloseTo(nums[6]!, 5) // x0 ≈ x3
    expect(nums[2]).toBeCloseTo(nums[4]!, 5) // x1 ≈ x2
  })

  it('handles max=0 without dividing by zero', () => {
    const d = segmentPath({ monthIndex: 5, cx: 50, cy: 50, innerR: 10, outerR: 20, value: 0, max: 0 })
    expect(d).toMatch(/^M /)
    expect(d).not.toContain('NaN')
  })

  it('is deterministic', () => {
    const a = segmentPath({ monthIndex: 3, cx: 50, cy: 50, innerR: 10, outerR: 20, value: 5, max: 10 })
    const b = segmentPath({ monthIndex: 3, cx: 50, cy: 50, innerR: 10, outerR: 20, value: 5, max: 10 })
    expect(a).toBe(b)
  })
})

describe('labelPosition', () => {
  it('places January in the upper-right quadrant', () => {
    const p = labelPosition(0, 50, 50, 20)
    // wedge 0 covers Jan; midpoint angle = (0.5/12) * 2π - π/2 ≈ -75°
    expect(p.x).toBeGreaterThan(50)
    expect(p.y).toBeLessThan(50)
  })

  it('places July in the lower-left quadrant', () => {
    const p = labelPosition(6, 50, 50, 20)
    expect(p.y).toBeGreaterThan(50)
    expect(p.x).toBeLessThan(50)
  })
})
