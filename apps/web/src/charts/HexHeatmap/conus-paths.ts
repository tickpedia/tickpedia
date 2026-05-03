import { CONUS_STATES } from './conus-outline.js'
import { CONUS_BBOX, type CanvasSize } from './h3-project.js'

// Project the simplified CONUS state outlines onto a canvas, returning
// an SVG path string per state. The chart renders these as a faint
// backdrop so a sparse-data view (e.g. a rare disease with two cells
// lit up) still tells the reader *which part of the country* the data
// is in.
//
// Projection mirrors `projectConus` in h3-project.ts — equirectangular
// cropped to the CONUS bbox. We don't drop points that fall outside
// the bbox (a state's coastline can dip slightly beyond it after
// simplification); we clamp instead, which keeps each ring closed.

const W = CONUS_BBOX.maxLng - CONUS_BBOX.minLng
const H = CONUS_BBOX.maxLat - CONUS_BBOX.minLat

export interface ConusPath {
  code: string
  name: string
  /** SVG `d` attribute. Multi-ring states emit a single `M…Z M…Z` path. */
  d: string
}

export function projectConusPaths(size: CanvasSize): ConusPath[] {
  const out: ConusPath[] = []
  for (const s of CONUS_STATES) {
    const segs: string[] = []
    for (const ring of s.rings) {
      if (ring.length < 4) continue
      let d = ''
      for (let i = 0; i < ring.length; i += 2) {
        const lng = ring[i]!
        const lat = ring[i + 1]!
        const tx = (lng - CONUS_BBOX.minLng) / W
        const ty = (CONUS_BBOX.maxLat - lat) / H
        const x = clamp01(tx) * size.width
        const y = clamp01(ty) * size.height
        d += i === 0 ? `M${round(x)} ${round(y)}` : ` L${round(x)} ${round(y)}`
      }
      d += 'Z'
      segs.push(d)
    }
    if (segs.length > 0) {
      out.push({ code: s.code, name: s.name, d: segs.join(' ') })
    }
  }
  return out
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
