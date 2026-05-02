import { segmentPath, labelPosition } from './segment.js'

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const

// Twelve-wedge radial bar chart for "when is X season?" — each wedge
// is one month, projected outward by the month's case count relative
// to the year's max.

export interface RadialSeasonalityProps {
  /** Length-12 array of monthly values (Jan..Dec). */
  months: readonly number[]
  size?: number
  ariaLabel?: string
}

export function RadialSeasonality({ months, size = 180, ariaLabel = 'Seasonality dial' }: RadialSeasonalityProps) {
  const cx = size / 2
  const cy = size / 2
  const innerR = size * 0.22
  const outerR = size * 0.46
  const max = Math.max(...months, 1)

  return (
    <svg
      width={size}
      height={size}
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'block' }}
    >
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="var(--rule)" />
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="var(--rule)" strokeDasharray="2 3" />

      {months.map((value, i) => (
        <path
          key={i}
          d={segmentPath({ monthIndex: i, cx, cy, innerR, outerR, value, max })}
          fill="var(--accent)"
          opacity={0.25 + 0.7 * (value / max)}
        />
      ))}

      {MONTH_LABELS.map((m, i) => {
        const { x, y } = labelPosition(i, cx, cy, outerR)
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="9"
            fontFamily='"Geist", sans-serif'
            fill="var(--muted)"
          >
            {m}
          </text>
        )
      })}
    </svg>
  )
}
