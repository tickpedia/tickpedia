// Compute the four corners of one wedge of the seasonality dial. Each
// wedge represents one calendar month (1/12 of a circle), pinned to
// the inner-radius circle on its short edge and projected outward to
// `value/max * (outer - inner)` on its long edge.
//
// Returned as an SVG path string (a quad: M → L → L → L → Z).

export interface SegmentInputs {
  /** 0..11 (Jan..Dec) — index of this wedge. */
  monthIndex: number
  cx: number
  cy: number
  innerR: number
  outerR: number
  /** Wedge value for this month. */
  value: number
  /** Maximum across all months — used to scale the wedge's outer radius. */
  max: number
}

export function segmentPath({ monthIndex, cx, cy, innerR, outerR, value, max }: SegmentInputs): string {
  const a0 = (monthIndex / 12) * Math.PI * 2 - Math.PI / 2
  const a1 = ((monthIndex + 1) / 12) * Math.PI * 2 - Math.PI / 2
  const r = innerR + (outerR - innerR) * (max > 0 ? value / max : 0)

  const x0 = cx + Math.cos(a0) * innerR
  const y0 = cy + Math.sin(a0) * innerR
  const x1 = cx + Math.cos(a1) * innerR
  const y1 = cy + Math.sin(a1) * innerR
  const x2 = cx + Math.cos(a1) * r
  const y2 = cy + Math.sin(a1) * r
  const x3 = cx + Math.cos(a0) * r
  const y3 = cy + Math.sin(a0) * r

  return `M ${round(x0)} ${round(y0)} L ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)} L ${round(x3)} ${round(y3)} Z`
}

// Position a label outside the outer radius for one month.
export function labelPosition(monthIndex: number, cx: number, cy: number, outerR: number, gap = 8) {
  const a = ((monthIndex + 0.5) / 12) * Math.PI * 2 - Math.PI / 2
  const x = cx + Math.cos(a) * (outerR + gap)
  const y = cy + Math.sin(a) * (outerR + gap) + 3
  return { x: round(x), y: round(y) }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
