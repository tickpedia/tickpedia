import { cellToLatLng } from 'h3-js'
import type { HexCell } from './synth-cells.js'

// H3 → canvas projection helpers. The `densityByH3` lens returns
// resolution-4 H3 indices (a hex string per cell); the HexHeatmap
// chart needs `{ x, y, v }` in canvas coordinates. This module is the
// glue.
//
// Projection is plain equirectangular cropped to the CONUS bounding
// box. Albers would be more honest at higher latitudes but needs
// d3-geo's projection machinery; equirectangular is 5 lines and
// visually correct at hex-cell resolution. Cells outside the CONUS
// bbox (Hawaii, Alaska, Puerto Rico, Guam) are dropped — re-introduce
// when the inset map ships.

export interface CanvasSize {
  width: number
  height: number
}

export const CONUS_BBOX = {
  minLat: 24,
  maxLat: 50,
  minLng: -125,
  maxLng: -66,
} as const

/**
 * Round-trip helper around h3-js: take an H3 index, return its
 * centroid as `{ lat, lng }`. Wrapped so the rest of the codebase
 * doesn't depend on h3-js's tuple shape.
 */
export function indexToLatLng(h3Index: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(h3Index)
  return { lat, lng }
}

/**
 * Project a `{ lat, lng }` to canvas coordinates within the CONUS
 * bbox. Returns `null` when the point falls outside the bbox.
 *
 * The canvas Y axis grows downward; lat grows northward — invert.
 */
export function projectConus(
  point: { lat: number; lng: number },
  size: CanvasSize,
): { x: number; y: number } | null {
  const { lat, lng } = point
  if (lat < CONUS_BBOX.minLat || lat > CONUS_BBOX.maxLat) return null
  if (lng < CONUS_BBOX.minLng || lng > CONUS_BBOX.maxLng) return null

  const tx = (lng - CONUS_BBOX.minLng) / (CONUS_BBOX.maxLng - CONUS_BBOX.minLng)
  const ty = (CONUS_BBOX.maxLat - lat) / (CONUS_BBOX.maxLat - CONUS_BBOX.minLat)
  return {
    x: tx * size.width,
    y: ty * size.height,
  }
}

export interface NormalizedDensityCell {
  h3Cell: string
  total: number
}

/**
 * Convert an array of normalized density rows to `HexCell[]` ready for
 * the HexHeatmap chart. Drops cells with empty indices, cells outside
 * CONUS, and zero-total cells (saves a render call).
 *
 * Normalized shape (`{ h3Cell, total }`) matches what the SSR cache
 * stores and what the runtime hooks return.
 *
 * The output's `v` is the raw `total` — the chart normalizes against
 * `max(v)` internally, so callers don't have to pre-scale.
 */
export function bucketsToCells(
  buckets: ReadonlyArray<NormalizedDensityCell>,
  size: CanvasSize,
): HexCell[] {
  const out: HexCell[] = []
  for (const b of buckets) {
    const idx = b.h3Cell
    if (typeof idx !== 'string' || idx.length === 0) continue
    const total = b.total
    if (total <= 0) continue

    let centroid: { lat: number; lng: number }
    try {
      centroid = indexToLatLng(idx)
    } catch {
      continue
    }
    const projected = projectConus(centroid, size)
    if (!projected) continue
    out.push({ x: projected.x, y: projected.y, v: total })
  }
  return out
}
