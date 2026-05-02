// One row of the BarRow chart: label, bar track, value. Splitting it
// out makes per-row variants (custom colors, sub-labels) cheap to add
// later.

export interface BarProps {
  label: string
  value: number
  max: number
  /** Formatter for the trailing numeric value. Defaults to locale string. */
  fmt?: ((n: number) => string) | undefined
  /** Bar fill color. Defaults to the brand accent. */
  color?: string | undefined
}

export function Bar({ label, value, max, fmt, color }: BarProps) {
  const format = fmt ?? ((n: number) => n.toLocaleString())
  const fill = color ?? 'var(--accent)'
  const widthPct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 64px',
        gap: 10,
        alignItems: 'center',
        fontSize: 12,
      }}
    >
      <span style={{ color: 'var(--ink-2)' }}>{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        style={{ height: 14, background: 'var(--bg-2)', border: '1px solid var(--rule)' }}
      >
        <div style={{ height: '100%', width: `${widthPct}%`, background: fill }} />
      </div>
      <span
        className="mono"
        style={{ textAlign: 'right', color: 'var(--muted)' }}
      >
        {format(value)}
      </span>
    </div>
  )
}
