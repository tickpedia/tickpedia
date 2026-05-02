import { projectPoints, strokePath, areaPath } from './path.js'

// Tiny line chart for inline numeric trends — used in tables and stat
// rows. No axes, no labels; the value is the trend shape, not the
// number. Pure SVG, no dependencies.

export interface SparklineProps {
  data: readonly number[]
  width?: number
  height?: number
  stroke?: string
  /** Fill area under the line (default true). */
  fill?: boolean
  /** Aria description (defaults to "trend sparkline"). */
  ariaLabel?: string
}

export function Sparkline({
  data,
  width = 120,
  height = 28,
  stroke = 'var(--accent)',
  fill = true,
  ariaLabel = 'trend sparkline',
}: SparklineProps) {
  if (data.length === 0) {
    return (
      <svg width={width} height={height} role="img" aria-label={`${ariaLabel} (empty)`} />
    )
  }
  const points = projectPoints(data, { width, height })
  const last = points[points.length - 1]!
  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel}
      style={{ display: 'block' }}
    >
      {fill && <path d={areaPath(points, { width, height })} fill={stroke} opacity="0.12" />}
      <path d={strokePath(points)} stroke={stroke} strokeWidth="1.25" fill="none" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={stroke} />
    </svg>
  )
}
