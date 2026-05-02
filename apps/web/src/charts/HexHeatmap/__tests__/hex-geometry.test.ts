import { describe, it, expect } from 'vitest'
import { hexPoints, gridDimensions, HEX_VERTEX_COUNT } from '../hex-geometry.js'

describe('hexPoints', () => {
  it('emits six space-separated vertex pairs', () => {
    const pts = hexPoints(50, 50, 10)
    const pairs = pts.split(' ')
    expect(pairs.length).toBe(HEX_VERTEX_COUNT)
    for (const p of pairs) expect(p.split(',').length).toBe(2)
  })

  it('produces vertices on a circle of radius r around (cx, cy)', () => {
    const cx = 100
    const cy = 100
    const r = 20
    const pairs = hexPoints(cx, cy, r).split(' ')
    for (const p of pairs) {
      const [x, y] = p.split(',').map(parseFloat) as [number, number]
      const distance = Math.hypot(x - cx, y - cy)
      expect(distance).toBeCloseTo(r, 1)
    }
  })

  it('is deterministic', () => {
    expect(hexPoints(1, 2, 3)).toBe(hexPoints(1, 2, 3))
  })
})

describe('gridDimensions', () => {
  it('packs more columns than rows for a wide canvas', () => {
    const { cols, rows } = gridDimensions(640, 320, 10)
    expect(cols).toBeGreaterThan(rows)
  })

  it('uses sqrt(3)*r as column stride and 1.5*r as row stride', () => {
    const { colStride, rowStride } = gridDimensions(100, 100, 10)
    expect(colStride).toBeCloseTo(Math.sqrt(3) * 10, 5)
    expect(rowStride).toBe(15)
  })

  it('handles zero canvas without negative grid sizes', () => {
    const { cols, rows } = gridDimensions(0, 0, 10)
    expect(cols).toBe(0)
    expect(rows).toBe(0)
  })
})
