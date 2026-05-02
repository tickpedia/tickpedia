import type { LineBox } from './path.js'
import { plotArea } from './path.js'

// Y-grid + axis label rows. Drawn behind the line. The bottom-most
// line is solid; the rest are dashed to keep value bands visible
// without competing with the line itself.

export interface AxisProps {
  box: LineBox
  max: number
  ticks?: number
}

export function Axis({ box, max, ticks = 4 }: AxisProps) {
  const { w, h } = plotArea(box)
  return (
    <g>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = box.pad.t + (h * i) / ticks
        const v = Math.round((max * (ticks - i)) / ticks)
        const isBaseline = i === ticks
        return (
          <g key={i}>
            <line
              x1={box.pad.l}
              y1={y}
              x2={box.pad.l + w}
              y2={y}
              stroke="var(--rule)"
              strokeWidth="1"
              strokeDasharray={isBaseline ? '' : '2 3'}
              opacity={isBaseline ? 1 : 0.7}
            />
            <text
              x={box.pad.l - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--muted)"
              fontFamily='"JetBrains Mono", monospace'
            >
              {v.toLocaleString()}
            </text>
          </g>
        )
      })}
    </g>
  )
}

// X-axis labels — one per tick, undersampled to ~8 positions. The
// year array length must match the data length; mismatched arrays are
// rendered against the available indices.
export interface XLabelsProps {
  box: LineBox
  years: readonly (string | number)[]
  points: ReadonlyArray<[number, number]>
}

export function XLabels({ box, years, points }: XLabelsProps) {
  if (years.length === 0 || points.length === 0) return null
  const stride = Math.max(1, Math.ceil(years.length / 8))
  return (
    <g>
      {years.map((y, i) => {
        if (i % stride !== 0) return null
        const pt = points[i]
        if (!pt) return null
        return (
          <text
            key={i}
            x={pt[0]}
            y={box.height - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--muted)"
            fontFamily='"JetBrains Mono", monospace'
          >
            {y}
          </text>
        )
      })}
    </g>
  )
}
