import { useMemo } from 'react'
import { DATA_RAMP, rampIndex, type DataRamp } from '../ramp.js'
import { Cell } from './Cell.js'
import { projectConusPaths } from './conus-paths.js'
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
  /** Render a faint CONUS state backdrop so sparse-data views still convey geography. */
  backdrop?: boolean
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
  backdrop = false,
  ariaLabel = 'Risk heatmap',
}: HexHeatmapProps) {
  const r = compact ? 7 : 10
  const list = cells ?? (synthesize ? synthesizeHexCells({ width, height, r, seed: 42 }) : [])
  const max = Math.max(...list.map((c) => c.v), 1)
  // CDC case counts are power-law: one or two hexes carry orders of
  // magnitude more than the rest, so a linear `v / max` collapses the
  // long tail under the threshold and the map reads as a few isolated
  // dots. log1p flattens the dynamic range — every populated hex lands
  // somewhere on the ramp and the regional spread becomes legible.
  const logMax = Math.log1p(max)

  const backdropPaths = useMemo(
    () => (backdrop ? projectConusPaths({ width, height }) : []),
    [backdrop, width, height],
  )

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
      {backdropPaths.length > 0 && (
        <g
          data-testid="hex-heatmap-backdrop"
          fill="var(--bg)"
          fillOpacity={0.55}
          stroke="var(--ink)"
          strokeOpacity={0.18}
          strokeWidth={0.6}
          strokeLinejoin="round"
        >
          {backdropPaths.map((p) => (
            <path key={p.code} d={p.d} />
          ))}
        </g>
      )}
      {list.map((c, i) => {
        const norm = logMax > 0 ? Math.log1p(c.v) / logMax : 0
        const idx = rampIndex(norm, ramp.length, threshold)
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
