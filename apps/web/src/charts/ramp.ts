// Ordinal data ramp shared by every value-encoded chart primitive
// (Choropleth, HexHeatmap, RampLegend). The ramp lives as CSS custom
// properties on the active theme — pass these strings as fills, the
// browser resolves them per theme.

export const DATA_RAMP = [
  'var(--d0)',
  'var(--d1)',
  'var(--d2)',
  'var(--d3)',
  'var(--d4)',
  'var(--d5)',
] as const

export type DataRamp = readonly string[]

// Map a 0..1 normalized value to an index in the ramp. Values <= 0
// return -1 so the caller can render an "absent" treatment (different
// from the lowest-bucket fill).
export function rampIndex(
  normalized: number,
  rampLength: number = DATA_RAMP.length,
  threshold = 0,
): number {
  if (normalized <= threshold) return -1
  return Math.min(rampLength - 1, Math.floor(normalized * rampLength))
}

// Pick the fill from a ramp for a raw value relative to a max.
// Returns null when the value is at or below `threshold` (caller picks
// the absent fill).
export function rampFill(
  value: number,
  max: number,
  ramp: DataRamp = DATA_RAMP,
  threshold = 0,
): string | null {
  if (max <= 0) return null
  const n = value / max
  const i = rampIndex(n, ramp.length, threshold)
  return i < 0 ? null : (ramp[i] ?? null)
}
