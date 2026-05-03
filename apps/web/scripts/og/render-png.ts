// satori → SVG → resvg → PNG. Pure helper — no I/O, no SemiLayer.
//
// Templates assemble a JSX tree of div / span / img elements with
// the satori-supported CSS subset (flexbox + basic positioning +
// fonts + colors). render-png.ts wraps satori + resvg in a single
// `Buffer`-returning call so each template can pretend the rasterise
// step doesn't exist.

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import type { ReactElement } from 'react'
import type { OgFont } from './load-fonts.js'
import { OG_WIDTH, OG_HEIGHT, OG_COLORS } from './colors.js'

export interface RenderOptions {
  fonts: OgFont[]
  width?: number
  height?: number
  /** PNG background colour. Defaults to the paper-theme `--bg`. */
  background?: string
}

/**
 * Render a JSX tree into a 1200×630 PNG buffer.
 *
 * The PNG is opaque (24-bit equivalent) — OG cards never need
 * transparency, and dropping the alpha channel saves ~30% on disk.
 * resvg achieves that via the `background` option, which paints the
 * canvas before rasterising.
 */
export async function renderPng(
  element: ReactElement,
  options: RenderOptions,
): Promise<Buffer> {
  const width = options.width ?? OG_WIDTH
  const height = options.height ?? OG_HEIGHT
  const svg = await satori(element, {
    width,
    height,
    fonts: options.fonts,
    embedFont: true,
  })
  const resvg = new Resvg(svg, {
    background: options.background ?? OG_COLORS.bg,
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: false },
  })
  return resvg.render().asPng()
}

/** Same pipeline but returns the intermediate SVG instead of a PNG.
 *  Useful for tests — pass `embedFont: false` to keep `<text>` content
 *  (rather than glyph paths) so assertions can grep for known strings. */
export async function renderSvg(
  element: ReactElement,
  options: RenderOptions & { embedFont?: boolean },
): Promise<string> {
  const width = options.width ?? OG_WIDTH
  const height = options.height ?? OG_HEIGHT
  return satori(element, {
    width,
    height,
    fonts: options.fonts,
    embedFont: options.embedFont ?? true,
  })
}
