import { DEFAULT_PAD, projectLine, strokePath, areaPath, type LineBox } from './path.js'
import { Axis, XLabels } from './Axis.js'

// Single-series time-series line chart with a soft area fill, a y-grid,
// and optional x-axis year labels. Static SVG; renders identically on
// the server and in the browser.

export interface LineChartProps {
  data: readonly number[]
  width?: number
  height?: number
  /** Shown as the eyebrow at the top-left of the plot area. */
  label?: string
  /** Optional x-axis tick labels. Length should match `data`. */
  years?: readonly (string | number)[] | null
  /** ARIA description (defaults to `${label} line chart`). */
  ariaLabel?: string
}

export function LineChart({
  data,
  width = 640,
  height = 220,
  label = 'Series',
  years = null,
  ariaLabel,
}: LineChartProps) {
  const box: LineBox = { width, height, pad: DEFAULT_PAD }
  const max = Math.max(...data, 1)
  const points = projectLine(data, box)
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? `${label} line chart`}
      style={{ display: 'block' }}
    >
      <Axis box={box} max={max} />
      <path d={areaPath(points, box)} fill="var(--accent)" opacity="0.10" />
      <path d={strokePath(points)} stroke="var(--accent)" strokeWidth="1.5" fill="none" />
      {years && <XLabels box={box} years={years} points={points} />}
      <text
        x={box.pad.l}
        y={12}
        fontSize="10"
        fill="var(--muted)"
        fontFamily='"Geist", sans-serif'
        letterSpacing="0.1em"
      >
        {label.toUpperCase()}
      </text>
    </svg>
  )
}
