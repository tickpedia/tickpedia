import { describe, it, expect } from 'vitest'
import { tickSvg, tickCrestSvg } from '../tick-art.js'

const COLORS = { headColor: '#1c1814', bodyColor: '#8a2a1a', legColor: '#1c1814' }

describe('tickSvg', () => {
  it('emits the body, head, and legs in 100x100 viewBox', () => {
    const svg = tickSvg(COLORS)
    expect(svg).toContain('viewBox="0 0 100 100"')
    expect(svg).toContain('<ellipse cx="50" cy="62" rx="16" ry="22"')
    expect(svg).toContain('<circle cx="50" cy="34" r="10"')
    expect(svg).toContain(COLORS.bodyColor)
    expect(svg).toContain(COLORS.headColor)
    expect(svg).toContain(COLORS.legColor)
  })
})

describe('tickCrestSvg', () => {
  it('embeds a double ring + four compass marks + the same animal as tickSvg', () => {
    const svg = tickCrestSvg(COLORS)
    expect(svg).toContain('viewBox="0 0 100 100"')
    // Outer + inner ring radii.
    expect(svg).toContain('r="48"')
    expect(svg).toContain('r="46"')
    // Four compass marks (two horizontal, two vertical).
    expect(svg).toContain('x1="50" y1="3" x2="50" y2="6"')
    expect(svg).toContain('x1="50" y1="97" x2="50" y2="94"')
    expect(svg).toContain('x1="3" y1="50" x2="6" y2="50"')
    expect(svg).toContain('x1="97" y1="50" x2="94" y2="50"')
    // Animal geometry matches tickSvg.
    expect(svg).toContain('<ellipse cx="50" cy="62" rx="16" ry="22"')
    expect(svg).toContain('<circle cx="50" cy="34" r="10"')
  })

  it('lets callers override the ring color', () => {
    const svg = tickCrestSvg(COLORS, { ringColor: '#ff00ff' })
    expect(svg).toContain('stroke="#ff00ff"')
  })

  it('defaults the ring color to paper-theme ink', () => {
    const svg = tickCrestSvg(COLORS)
    expect(svg).toContain('stroke="#1c1814"')
  })

  it('uses default colors when a slot is null', () => {
    const svg = tickCrestSvg({ headColor: null, bodyColor: null, legColor: null })
    expect(svg).toContain('fill="#3a2a1a"')
    expect(svg).toContain('fill="#7a4a2a"')
  })
})
