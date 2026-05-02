// Mockup-data generator for the design showcase. Produces a believable
// continental-US hex distribution with hotspots over the Northeast,
// upper Midwest, Appalachia, the Southeast, and the Pacific Northwest.
//
// Real consumer data comes from `diseaseCountyYear.densityByH3`; the
// real-data adapter (h3 → projected x/y) lands when the /risk page
// is built (phase 10).

import { gridDimensions } from './hex-geometry.js'

export interface HexCell {
  x: number
  y: number
  /** Pre-normalized 0..1 intensity. */
  v: number
}

interface Hotspot {
  /** Normalized canvas coords. */
  nx: number
  ny: number
  /** Falloff radius in normalized canvas units. */
  r: number
  /** Peak intensity at the center. */
  peak: number
}

export const DEFAULT_HOTSPOTS: readonly Hotspot[] = [
  { nx: 0.78, ny: 0.32, r: 0.18, peak: 1.0 },  // NE / NJ / PA
  { nx: 0.66, ny: 0.28, r: 0.18, peak: 0.9 },  // upper midwest
  { nx: 0.72, ny: 0.45, r: 0.16, peak: 0.55 }, // appalachia
  { nx: 0.55, ny: 0.62, r: 0.14, peak: 0.4 },  // SE
  { nx: 0.18, ny: 0.4, r: 0.12, peak: 0.25 },  // pac NW
]

export interface SynthOptions {
  width: number
  height: number
  r: number
  hotspots?: readonly Hotspot[]
  /** Deterministic noise seed. Defaults to no noise. */
  seed?: number
}

export function synthesizeHexCells(opts: SynthOptions): HexCell[] {
  const { width, height, r, hotspots = DEFAULT_HOTSPOTS, seed } = opts
  const { cols, rows, colStride, rowStride } = gridDimensions(width, height, r)
  const out: HexCell[] = []
  const rng = seed != null ? makeRng(seed) : null

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const odd = row % 2
      const x = col * colStride + (odd ? colStride / 2 : 0) + r
      const y = row * rowStride + r
      if (x > width - r || y > height - r) continue

      const nx = x / width
      const ny = y / height
      // Continental rough mask: trapezoid with FL prong; cuts off the
      // top-left ocean and the bottom-right water.
      const inUS = ny > 0.12 && ny < 0.88 && nx > 0.06 && nx < 0.96 && !(nx < 0.2 && ny < 0.45)
      if (!inUS) continue

      let v = 0
      for (const hs of hotspots) {
        const d = Math.hypot(nx - hs.nx, ny - hs.ny)
        v += hs.peak * Math.max(0, 1 - d / hs.r)
      }
      if (rng) v = Math.min(1, v + (rng() - 0.5) * 0.05)
      else v = Math.min(1, v)

      if (v > 0.04) out.push({ x: round(x), y: round(y), v })
    }
  }
  return out
}

// Tiny LCG for deterministic noise. Not cryptographic.
function makeRng(seed: number): () => number {
  let state = (seed >>> 0) || 1
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
