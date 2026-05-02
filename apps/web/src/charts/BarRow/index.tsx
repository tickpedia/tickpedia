import { Bar } from './Bar.js'

// Horizontal bar chart, one row per category. Used for "cases by
// state" / "diseases by tick" / leaderboard-adjacent surfaces where
// the rank order matters more than the absolute value.

export interface BarRowDatum {
  label: string
  value: number
}

export interface BarRowProps {
  rows: readonly BarRowDatum[]
  /** Cap the bar widths against. Defaults to the max value in the rows. */
  max?: number
  fmt?: (n: number) => string
  barColor?: string
}

export function BarRow({ rows, max, fmt, barColor }: BarRowProps) {
  const cap = max ?? Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="ui" style={{ display: 'grid', gap: 4 }} data-testid="bar-row">
      {rows.map((r) => (
        <Bar key={r.label} label={r.label} value={r.value} max={cap} fmt={fmt} color={barColor} />
      ))}
    </div>
  )
}
