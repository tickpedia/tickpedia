import { describe, it, expect } from 'vitest'
import { STATE_GRID, GRID_COLS, GRID_ROWS } from '../state-grid.js'

describe('STATE_GRID', () => {
  it('contains 51 entries (50 states + DC)', () => {
    expect(STATE_GRID.length).toBe(51)
  })

  it('uses unique 2-letter USPS codes', () => {
    const codes = STATE_GRID.map((t) => t.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('keeps every cell within the declared grid bounds', () => {
    for (const { gx, gy, code } of STATE_GRID) {
      expect(gx, code).toBeGreaterThanOrEqual(0)
      expect(gx, code).toBeLessThanOrEqual(GRID_COLS - 1)
      expect(gy, code).toBeGreaterThanOrEqual(0)
      expect(gy, code).toBeLessThanOrEqual(GRID_ROWS - 1)
    }
  })

  it('places known states at their expected geographic neighbourhood', () => {
    const find = (code: string) => STATE_GRID.find((t) => t.code === code)!
    expect(find('AK').gx).toBe(0)
    expect(find('AK').gy).toBe(0)
    expect(find('HI').gy).toBe(5)
    expect(find('FL').gy).toBe(6)
    // Maine is the easternmost top-row state in this layout
    expect(find('ME').gx).toBe(GRID_COLS - 1)
  })
})
