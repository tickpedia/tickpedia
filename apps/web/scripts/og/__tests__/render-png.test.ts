import { describe, it, expect } from 'vitest'
import { renderPng, renderSvg } from '../render-png.js'
import { loadOgFonts } from '../load-fonts.js'
import { DefaultTemplate } from '../templates/default.js'
import { OG_WIDTH, OG_HEIGHT } from '../colors.js'

// Smoke: tiny JSX → real PNG buffer. Verifies satori finds the fonts,
// resvg can rasterise the SVG, and the output is a recognisable PNG.
//
// We never snapshot the bytes — resvg version drift would make those
// brittle. We snapshot SVG (text) for templates instead (separate
// test). Here we just check shape.

describe('renderPng end-to-end', () => {
  it('rasterises the default template into a PNG buffer of >5KB', async () => {
    const fonts = await loadOgFonts()
    const buf = await renderPng(DefaultTemplate({}), { fonts })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(5000)
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50)
    expect(buf[2]).toBe(0x4e)
    expect(buf[3]).toBe(0x47)
  }, 15000)

  it('renderSvg returns a 1200x630 SVG', async () => {
    const fonts = await loadOgFonts()
    const svg = await renderSvg(DefaultTemplate({}), { fonts })
    expect(svg).toContain(`width="${OG_WIDTH}"`)
    expect(svg).toContain(`height="${OG_HEIGHT}"`)
    expect(svg.startsWith('<svg')).toBe(true)
  }, 15000)
})
