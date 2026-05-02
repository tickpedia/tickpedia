import { describe, it, expect } from 'vitest'
import { DEFAULT_PAD, plotArea, projectLine, strokePath, areaPath } from '../path.js'

const BOX = { width: 600, height: 200, pad: DEFAULT_PAD }

describe('plotArea', () => {
  it('subtracts pad from outer dimensions', () => {
    expect(plotArea(BOX)).toEqual({
      w: 600 - DEFAULT_PAD.l - DEFAULT_PAD.r,
      h: 200 - DEFAULT_PAD.t - DEFAULT_PAD.b,
    })
  })
})

describe('projectLine', () => {
  it('returns no points for empty data', () => {
    expect(projectLine([], BOX)).toEqual([])
  })

  it('places the first point at the left pad and the last at right minus right-pad', () => {
    const pts = projectLine([1, 2, 3, 4], BOX)
    expect(pts[0]![0]).toBe(BOX.pad.l)
    expect(pts[pts.length - 1]![0]).toBe(BOX.width - BOX.pad.r)
  })

  it('puts the max value at the top of the plot area', () => {
    const pts = projectLine([0, 10, 5], BOX)
    const maxY = Math.min(...pts.map((p) => p[1]))
    expect(pts[1]![1]).toBe(maxY)
    expect(maxY).toBeGreaterThanOrEqual(BOX.pad.t)
  })

  it('puts the zero baseline at the bottom of the plot area', () => {
    const pts = projectLine([0, 10], BOX)
    const baselineY = BOX.pad.t + plotArea(BOX).h
    expect(pts[0]![1]).toBe(baselineY)
  })
})

describe('strokePath', () => {
  it('builds an M + L chain', () => {
    const d = strokePath([[10, 20], [30, 40]])
    expect(d).toBe('M 10 20 L 30 40')
  })

  it('returns an empty string for no points', () => {
    expect(strokePath([])).toBe('')
  })
})

describe('areaPath', () => {
  it('closes back along the chart baseline', () => {
    const pts: Array<[number, number]> = [[44, 100], [584, 50]]
    const d = areaPath(pts, BOX)
    expect(d).toContain('L 584')
    expect(d).toContain('L 44')
    expect(d.endsWith(' Z')).toBe(true)
  })
})
