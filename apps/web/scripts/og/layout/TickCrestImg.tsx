import type { CSSProperties } from 'react'
import { Resvg } from '@resvg/resvg-js'
import { tickSvg, type TickArtColors } from '@tickpedia/ui'

// Pre-rasterise the @tickpedia/ui tick SVG at OG resolution and embed
// it as a PNG data URL in a satori <img>. satori can render simple
// SVG inline, but the tick illustration is paired with an outer crest
// frame in real life — and once we're rasterising, going through resvg
// gives us a stable PNG that satori treats as opaque artwork without
// having to teach satori our SVG idioms.
//
// The returned <img> is an absolutely-sized 360×360 element ready to
// drop into the tick template's left column.

const FRAME_RADIUS = 12
const CREST_PX = 320

export function tickCrestPng(colors: TickArtColors): string {
  // Scale the 100x100 viewBox up to 320 so the silhouette has real
  // pixels. resvg's `fitTo: { mode: 'width' }` does the upscale.
  const svg = tickSvg(colors)
  const png = new Resvg(svg, {
    background: 'transparent',
    fitTo: { mode: 'width', value: CREST_PX },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng()
  return `data:image/png;base64,${png.toString('base64')}`
}

interface Props {
  colors: TickArtColors
  /** Hex string for the crest's framing background. Pulls from the
   *  paper-theme `--surface` token by default. */
  background?: string
  /** Hex string for the framing border. Defaults to `--rule`. */
  border?: string
}

export function TickCrestImg({
  colors,
  background = '#fbf7ee',
  border = '#d9cdb6',
}: Props) {
  const dataUrl = tickCrestPng(colors)
  const wrap: CSSProperties = {
    width: 360,
    height: 360,
    borderRadius: FRAME_RADIUS,
    backgroundColor: background,
    border: `1px solid ${border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }
  const img: CSSProperties = {
    width: CREST_PX,
    height: CREST_PX,
    display: 'flex',
  }
  return (
    <div style={wrap}>
      <img src={dataUrl} width={CREST_PX} height={CREST_PX} style={img} alt="" />
    </div>
  )
}
