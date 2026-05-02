import { describe, it, expect } from 'vitest'
import { projectPoints, strokePath, areaPath } from '../path.js'

const BOX = { width: 100, height: 30 }

describe('projectPoints', () => {
  it('returns no points for empty input', () => {
    expect(projectPoints([], BOX)).toEqual([])
  })

  it('centers a single point horizontally', () => {
    const [pt] = projectPoints([5], BOX)
    expect(pt![0]).toBe(50)
  })

  it('spreads N points evenly across the width', () => {
    const pts = projectPoints([1, 2, 3], BOX)
    expect(pts[0]![0]).toBe(0)
    expect(pts[1]![0]).toBe(50)
    expect(pts[2]![0]).toBe(100)
  })

  it('places the max value near the top and min near the bottom', () => {
    const pts = projectPoints([1, 10, 5], BOX)
    const [min, max, mid] = [pts[0]!, pts[1]!, pts[2]!]
    expect(max[1]).toBeLessThan(min[1])
    expect(mid[1]).toBeGreaterThan(max[1])
  })

  it('handles a flat series without dividing by zero', () => {
    const pts = projectPoints([5, 5, 5], BOX)
    for (const [, y] of pts) {
      expect(Number.isFinite(y)).toBe(true)
    }
  })
})

describe('strokePath', () => {
  it('emits an M then a chain of Ls', () => {
    const d = strokePath([[0, 10], [50, 5], [100, 8]])
    expect(d).toBe('M 0 10 L 50 5 L 100 8')
  })

  it('returns an empty string for no points', () => {
    expect(strokePath([])).toBe('')
  })
})

describe('areaPath', () => {
  it('closes the polyline back along the baseline', () => {
    const pts: Array<[number, number]> = [[0, 10], [100, 5]]
    const d = areaPath(pts, BOX)
    expect(d).toBe('M 0 10 L 100 5 L 100 30 L 0 30 Z')
  })

  it('returns an empty string for no points', () => {
    expect(areaPath([], BOX)).toBe('')
  })
})
