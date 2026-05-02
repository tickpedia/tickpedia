import type { ReactNode } from 'react'

// Compact ranked-list table — used for "worst tick counties in
// America" and similar countdown surfaces. Rows can carry an optional
// trailing slot (typically a Sparkline) and a badge slot for chips.
//
// The styling matches `.tp-table` — tabular-num values, hairline
// rules, hover wash. Each row may be wrapped in a link by the caller
// via the `href` field.

export interface LeaderboardRow {
  rank: number
  label: string
  href?: string
  /** Right-aligned numeric value (formatted by `valueFmt`). */
  value: number
  /** Optional secondary stat shown under the label (e.g. region). */
  sub?: string
  /** Optional chip-shaped badge (e.g. "established"). */
  badge?: ReactNode
  /** Optional trailing slot — typically a Sparkline. */
  trailing?: ReactNode
}

export interface LeaderboardProps {
  rows: readonly LeaderboardRow[]
  /** Column header for the value column. */
  valueLabel?: string
  valueFmt?: (n: number) => string
  caption?: string
}

export function Leaderboard({
  rows,
  valueLabel = 'Value',
  valueFmt = (n) => n.toLocaleString(),
  caption,
}: LeaderboardProps) {
  return (
    <table className="tp-table" data-testid="leaderboard">
      {caption && <caption style={{ textAlign: 'left', marginBottom: 6 }}>{caption}</caption>}
      <thead>
        <tr>
          <th style={{ width: 36 }}>#</th>
          <th>Name</th>
          <th className="num">{valueLabel}</th>
          <th style={{ width: 120 }} aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.rank}-${r.label}`}>
            <td className="mono" style={{ color: 'var(--muted)' }}>
              {r.rank}
            </td>
            <td>
              {r.href ? (
                <a href={r.href} style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}>
                  {r.label}
                </a>
              ) : (
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}>{r.label}</span>
              )}
              {r.sub && (
                <div className="ui" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {r.sub}
                </div>
              )}
              {r.badge && <span style={{ marginLeft: 8 }}>{r.badge}</span>}
            </td>
            <td className="num">{valueFmt(r.value)}</td>
            <td>{r.trailing}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
