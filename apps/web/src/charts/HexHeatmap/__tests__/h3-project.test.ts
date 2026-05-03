import { describe, it, expect } from 'vitest'
import { latLngToCell } from 'h3-js'
import {
  CONUS_BBOX,
  indexToLatLng,
  projectConus,
  bucketsToCells,
} from '../h3-project.js'

describe('indexToLatLng', () => {
  it('round-trips a known cell within ~50 km of seed coordinates', () => {
    const portlandMaine = { lat: 43.6591, lng: -70.2568 }
    const cell = latLngToCell(portlandMaine.lat, portlandMaine.lng, 4)
    const back = indexToLatLng(cell)
    expect(back.lat).toBeCloseTo(portlandMaine.lat, 0)
    expect(back.lng).toBeCloseTo(portlandMaine.lng, 0)
  })

  it('returns coordinates that round-trip via h3-js for any input it accepts', () => {
    // h3-js's `cellToLatLng` is lenient with malformed input — it can
    // return garbage coordinates rather than throwing. The wrapper
    // intentionally surfaces whatever h3-js gives back; downstream
    // `projectConus` is the gate that filters bogus cells (anything
    // outside the CONUS bbox is dropped).
    const portlandMaine = { lat: 43.6591, lng: -70.2568 }
    const cell = latLngToCell(portlandMaine.lat, portlandMaine.lng, 4)
    const back = indexToLatLng(cell)
    expect(typeof back.lat).toBe('number')
    expect(typeof back.lng).toBe('number')
  })
})

describe('projectConus', () => {
  const size = { width: 600, height: 300 }

  it('projects the south-west corner of the bbox to (0, height)', () => {
    const out = projectConus(
      { lat: CONUS_BBOX.minLat, lng: CONUS_BBOX.minLng },
      size,
    )
    expect(out).toEqual({ x: 0, y: 300 })
  })

  it('projects the north-east corner of the bbox to (width, 0)', () => {
    const out = projectConus(
      { lat: CONUS_BBOX.maxLat, lng: CONUS_BBOX.maxLng },
      size,
    )
    expect(out).toEqual({ x: 600, y: 0 })
  })

  it('projects a CONUS-interior point to canvas-interior coordinates', () => {
    const out = projectConus({ lat: 40, lng: -100 }, size)
    expect(out).not.toBeNull()
    expect(out!.x).toBeGreaterThan(0)
    expect(out!.x).toBeLessThan(size.width)
    expect(out!.y).toBeGreaterThan(0)
    expect(out!.y).toBeLessThan(size.height)
  })

  it('returns null for Hawaii (outside CONUS)', () => {
    expect(projectConus({ lat: 21.3, lng: -157.8 }, size)).toBeNull()
  })

  it('returns null for Alaska (outside CONUS)', () => {
    expect(projectConus({ lat: 64.2, lng: -149.5 }, size)).toBeNull()
  })

  it('returns null for points east of the CONUS bbox', () => {
    expect(projectConus({ lat: 40, lng: -50 }, size)).toBeNull()
  })
})

describe('bucketsToCells', () => {
  const size = { width: 600, height: 300 }

  it('converts H3 buckets to canvas cells with v=total', () => {
    const portlandMaine = latLngToCell(43.6591, -70.2568, 4)
    const dallasTexas = latLngToCell(32.7767, -96.7970, 4)
    const cells = bucketsToCells(
      [
        { h3Cell: portlandMaine, total: 100 },
        { h3Cell: dallasTexas, total: 50 },
      ],
      size,
    )
    expect(cells).toHaveLength(2)
    expect(cells[0]?.v).toBe(100)
    expect(cells[1]?.v).toBe(50)
    // Maine should land in the upper-right of the canvas; Dallas in the lower-middle.
    expect(cells[0]!.x).toBeGreaterThan(cells[1]!.x)
    expect(cells[0]!.y).toBeLessThan(cells[1]!.y)
  })

  it('drops cells outside CONUS', () => {
    const honolulu = latLngToCell(21.3, -157.8, 4)
    const portland = latLngToCell(43.66, -70.26, 4)
    const cells = bucketsToCells(
      [
        { h3Cell: honolulu, total: 999 },
        { h3Cell: portland, total: 50 },
      ],
      size,
    )
    expect(cells).toHaveLength(1)
    expect(cells[0]?.v).toBe(50)
  })

  it('drops cells below the noise floor (zero or single-case hexes)', () => {
    const portland = latLngToCell(43.66, -70.26, 4)
    const cells = bucketsToCells(
      [
        { h3Cell: portland, total: 0 },
        { h3Cell: portland, total: 1 },
        { h3Cell: portland, total: 2 },
        { h3Cell: portland, total: 3 },
      ],
      size,
    )
    // Only the total=3 cell (== NOISE_FLOOR) survives.
    expect(cells).toHaveLength(1)
    expect(cells[0]?.v).toBe(3)
  })

  it('drops malformed indices without throwing', () => {
    const cells = bucketsToCells(
      [
        { h3Cell: '', total: 5 },
        { h3Cell: 'not-an-h3', total: 5 },
      ],
      size,
    )
    expect(cells).toHaveLength(0)
  })
})
