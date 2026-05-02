import { describe, it, expect } from 'vitest'
import { synthesizeHexCells, DEFAULT_HOTSPOTS } from '../synth-cells.js'

describe('synthesizeHexCells', () => {
  it('returns at least one cell for a reasonably sized canvas', () => {
    const cells = synthesizeHexCells({ width: 640, height: 320, r: 10 })
    expect(cells.length).toBeGreaterThan(20)
  })

  it('clusters intensity near the configured hotspots', () => {
    const W = 640
    const H = 320
    const cells = synthesizeHexCells({ width: W, height: H, r: 10 })
    const hottest = cells.reduce((a, b) => (b.v > a.v ? b : a))
    // The highest-intensity hotspot is at nx=0.78, ny=0.32 (NE)
    const nx = hottest.x / W
    const ny = hottest.y / H
    const distToNE = Math.hypot(nx - DEFAULT_HOTSPOTS[0]!.nx, ny - DEFAULT_HOTSPOTS[0]!.ny)
    expect(distToNE).toBeLessThan(0.2)
  })

  it('respects the continental mask (no Pacific or Gulf cells)', () => {
    const W = 640
    const H = 320
    const cells = synthesizeHexCells({ width: W, height: H, r: 10 })
    for (const c of cells) {
      const nx = c.x / W
      const ny = c.y / H
      // The mask cuts the upper-left corner (Pacific NW ocean)
      expect(nx < 0.2 && ny < 0.45).toBe(false)
    }
  })

  it('is deterministic when given a seed', () => {
    const a = synthesizeHexCells({ width: 200, height: 200, r: 10, seed: 7 })
    const b = synthesizeHexCells({ width: 200, height: 200, r: 10, seed: 7 })
    expect(a).toEqual(b)
  })

  it('changes output when the seed changes', () => {
    const a = synthesizeHexCells({ width: 200, height: 200, r: 10, seed: 1 })
    const b = synthesizeHexCells({ width: 200, height: 200, r: 10, seed: 999 })
    expect(a).not.toEqual(b)
  })

  it('all intensities sit in 0..1', () => {
    const cells = synthesizeHexCells({ width: 400, height: 300, r: 10 })
    for (const c of cells) {
      expect(c.v).toBeGreaterThan(0)
      expect(c.v).toBeLessThanOrEqual(1)
    }
  })
})
