import { DATA_RAMP, rampIndex, type DataRamp } from '../ramp.js'
import { Cell } from './Cell.js'
import { synthesizeHexCells, type HexCell } from './synth-cells.js'

// Continental, border-agnostic risk heatmap. Each cell is a flat-top
// hexagon; fill maps an intensity value (0..1) to the ordinal data
// ramp. Pre-projected: caller supplies `cells` with x/y in canvas
// coordinates and a normalized intensity.
//
// For the design showcase + the disease-page mini-map, pass
// `synthesize` and let the component generate believable continental
// data.

export interface HexHeatmapProps {
  width?: number
  height?: number
  /** Pre-projected cells. If omitted and `synthesize` is true, mockup data is generated. */
  cells?: readonly HexCell[]
  ramp?: DataRamp
  /** Compact mode shrinks the hex radius and the contrast. */
  compact?: boolean
  /** Drop-below intensity — cells under this aren't rendered. */
  threshold?: number
  /** Generate believable mockup data when no cells are supplied. */
  synthesize?: boolean
  ariaLabel?: string
}

export function HexHeatmap({
  width = 640,
  height = 320,
  cells,
  ramp = DATA_RAMP,
  compact = false,
  threshold = 0.06,
  synthesize = false,
  ariaLabel = 'Risk heatmap',
}: HexHeatmapProps) {
  const r = compact ? 7 : 10
  const list = cells ?? (synthesize ? synthesizeHexCells({ width, height, r, seed: 42 }) : [])
  const max = Math.max(...list.map((c) => c.v), 1)

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      data-testid="hex-heatmap"
      style={{ display: 'block' }}
    >
      <rect x="0" y="0" width={width} height={height} fill="var(--bg-2)" opacity="0.4" />
      {list.map((c, i) => {
        const idx = rampIndex(c.v / max, ramp.length, threshold)
        if (idx < 0) return null
        const fill = ramp[idx]!
        return <Cell key={i} cx={c.x} cy={c.y} r={r} fill={fill} />
      })}
    </svg>
  )
}

// Re-export the cell shape so callers don't have to import it from the
// helper module path directly.
export type { HexCell } from './synth-cells.js'
export { synthesizeHexCells } from './synth-cells.js'
