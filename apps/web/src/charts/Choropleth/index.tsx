import { DATA_RAMP, rampIndex, type DataRamp } from '../ramp.js'
import { STATE_GRID, GRID_COLS, GRID_ROWS } from './state-grid.js'
import { Cell } from './Cell.js'

// Square-cartogram US choropleth — 50 states + DC laid out in
// approximate geographic positions on a 7×11 grid. Pre-projected;
// works without TopoJSON, WebGL, or browser geo APIs. Drives the
// `casesByState` and `establishedByState` analyses.

export interface ChoroplethProps {
  /** Map keyed by 2-letter USPS code (e.g. `MA`, `CA`). Missing keys read as 0. */
  data: Readonly<Record<string, number>>
  width?: number
  height?: number
  ramp?: DataRamp
  label?: string
  ariaLabel?: string
}

export function Choropleth({
  data,
  width = 320,
  height = 200,
  ramp = DATA_RAMP,
  label = '',
  ariaLabel = 'US choropleth',
}: ChoroplethProps) {
  const cell = Math.min(width / (GRID_COLS + 1), height / GRID_ROWS) * 0.95
  const ox = (width - cell * GRID_COLS) / 2
  const oy = 8
  const max = Math.max(...Object.values(data), 1)

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      data-testid="choropleth"
    >
      {STATE_GRID.map(({ code, gx, gy }) => {
        const v = data[code] ?? 0
        const idx = max > 0 ? rampIndex(v / max, ramp.length) : -1
        const fill = idx < 0 ? 'var(--bg-2)' : (ramp[idx] ?? 'var(--bg-2)')
        return (
          <Cell
            key={code}
            code={code}
            x={ox + gx * cell}
            y={oy + gy * cell}
            size={cell}
            fill={fill}
            rampIndex={idx}
          />
        )
      })}
      {label && (
        <text
          x="8"
          y={height - 8}
          fontSize="10"
          fill="var(--muted)"
          fontFamily='"Geist", sans-serif'
          letterSpacing="0.1em"
        >
          {label.toUpperCase()}
        </text>
      )}
    </svg>
  )
}
