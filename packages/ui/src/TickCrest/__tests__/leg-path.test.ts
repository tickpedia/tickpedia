import { describe, it, expect } from 'vitest'
import { legPath } from '../leg-path.js'

describe('TickCrest/legPath', () => {
  it('starts the path with a moveTo', () => {
    const d = legPath(50, 56, 32, 'L')
    expect(d.startsWith('M ')).toBe(true)
  })

  it('uses a quadratic Bezier (one Q control)', () => {
    const d = legPath(50, 56, 32, 'L')
    const qCount = d.match(/\sQ\s/g)?.length ?? 0
    expect(qCount).toBe(1)
  })

  it('mirrors the x-component when flipping side', () => {
    const left = parseEnd(legPath(50, 56, 32, 'L'))
    const right = parseEnd(legPath(50, 56, 32, 'R'))
    // x components are reflected around cx=50
    expect(left.x).toBeLessThan(50)
    expect(right.x).toBeGreaterThan(50)
    expect(50 - left.x).toBeCloseTo(right.x - 50, 5)
  })

  it('keeps y-end in sane bounds for typical leg angles', () => {
    for (const a of [-32, -18, 18, 32]) {
      const { y } = parseEnd(legPath(50, 56, a, 'L'))
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(120)
    }
  })

  it('emits exactly four whitespace-separated tokens after the M and Q', () => {
    // M x y Q mx my ex ey  →  8 tokens
    const tokens = legPath(50, 56, 18, 'R').split(/\s+/).filter(Boolean)
    expect(tokens.length).toBe(8)
    expect(tokens[0]).toBe('M')
    expect(tokens[3]).toBe('Q')
  })
})

function parseEnd(d: string): { x: number; y: number } {
  // legPath emits "M x1 y1 Q mx my ex ey" — the end point is the last two tokens.
  const tokens = d.split(/\s+/).filter(Boolean)
  return {
    x: Number(tokens[tokens.length - 2]),
    y: Number(tokens[tokens.length - 1]),
  }
}
