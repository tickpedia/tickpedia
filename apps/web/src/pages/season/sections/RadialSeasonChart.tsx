// Radial monthly chart for /season. 12-spoke wheel; bar length is
// proportional to that month's case total relative to the year's
// peak. Pure SVG, no client-side math beyond projection.

const MONTH_LABELS: ReadonlyArray<string> = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export interface RadialSeasonChartProps {
  /** [Jan..Dec] cumulative cases. */
  cumulativeByMonth: ReadonlyArray<number>
  size?: number
  ariaLabel?: string
}

export function RadialSeasonChart({
  cumulativeByMonth,
  size = 420,
  ariaLabel = 'Monthly tick-borne disease seasonality',
}: RadialSeasonChartProps) {
  const cx = size / 2
  const cy = size / 2
  const innerR = size * 0.18
  const outerR = size * 0.46

  const peak = Math.max(1, ...cumulativeByMonth)

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: size, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={ariaLabel}
    >
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="var(--rule)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="var(--rule)" strokeWidth={1} />

      {cumulativeByMonth.map((value, idx) => {
        const angleStart = (idx / 12) * 2 * Math.PI - Math.PI / 2
        const angleEnd = ((idx + 1) / 12) * 2 * Math.PI - Math.PI / 2
        const angleMid = (angleStart + angleEnd) / 2

        const ratio = value / peak
        const r = innerR + (outerR - innerR) * ratio

        const x1 = cx + Math.cos(angleStart) * innerR
        const y1 = cy + Math.sin(angleStart) * innerR
        const x2 = cx + Math.cos(angleStart) * r
        const y2 = cy + Math.sin(angleStart) * r
        const x3 = cx + Math.cos(angleEnd) * r
        const y3 = cy + Math.sin(angleEnd) * r
        const x4 = cx + Math.cos(angleEnd) * innerR
        const y4 = cy + Math.sin(angleEnd) * innerR

        const labelR = outerR + 14
        const lx = cx + Math.cos(angleMid) * labelR
        const ly = cy + Math.sin(angleMid) * labelR

        const isPeak = value === peak && value > 0

        return (
          <g key={idx}>
            <path
              d={`M${x1},${y1} L${x2},${y2} A${r},${r} 0 0 1 ${x3},${y3} L${x4},${y4} Z`}
              fill={isPeak ? 'var(--accent)' : 'var(--ink-2)'}
              opacity={isPeak ? 0.95 : 0.55}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="mono"
              fontSize={11}
              fill="var(--muted)"
            >
              {MONTH_LABELS[idx]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
