import { DATA_RAMP, rampIndex, type DataRamp } from '../ramp.js'
import { STATE_GRID, GRID_COLS, GRID_ROWS } from './state-grid.js'
import { Cell } from './Cell.js'

export { STATES_BY_USPS, stateNameFor, stateSlugFor, type UspsState } from './states.js'

// Square-cartogram US choropleth — 50 states + DC laid out in
// approximate geographic positions on a 7×11 grid. Pre-projected;
// works without TopoJSON, WebGL, or browser geo APIs. Drives the
// `casesByState` and `establishedByState` analyses.
//
// Cells become clickable when `linkFor` returns a string (per state
// code); a `titleFor` callback fills the SVG `<title>` so cells get
// native hover tooltips. Both are opt-in — pure-decorative
// choropleths just omit them.

export interface ChoroplethProps {
  /** Map keyed by 2-letter USPS code (e.g. `MA`, `CA`). Missing keys read as 0. */
  data: Readonly<Record<string, number>>
  width?: number
  height?: number
  ramp?: DataRamp
  label?: string
  ariaLabel?: string
  /** Per-cell URL (e.g. `code => /states/${slug}`). Return `null` to skip. */
  linkFor?: (code: string, value: number) => string | null
  /** Per-cell hover tooltip (SVG `<title>`). Return `null` to skip. */
  titleFor?: (code: string, value: number) => string | null
}

export function Choropleth({
  data,
  width = 320,
  height = 200,
  ramp = DATA_RAMP,
  label = '',
  ariaLabel = 'US choropleth',
  linkFor,
  titleFor,
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
        const href = linkFor?.(code, v) ?? undefined
        const title = titleFor?.(code, v) ?? undefined
        return (
          <Cell
            key={code}
            code={code}
            x={ox + gx * cell}
            y={oy + gy * cell}
            size={cell}
            fill={fill}
            rampIndex={idx}
            {...(href ? { href } : {})}
            {...(title ? { title } : {})}
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
