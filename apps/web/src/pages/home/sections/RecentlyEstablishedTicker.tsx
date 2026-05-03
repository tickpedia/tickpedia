import { pathFor } from '../../../routes/index.js'
import type { RecentlyEstablishedRow } from '../data/useRecentlyEstablished.js'

// Newly-established ticker strip — single row, hairline-bordered.
// Hides entirely when the feed returns 0 rows.

export interface RecentlyEstablishedTickerProps {
  rows: ReadonlyArray<RecentlyEstablishedRow>
  loading: boolean
}

export function RecentlyEstablishedTicker({
  rows,
  loading,
}: RecentlyEstablishedTickerProps) {
  if (loading) return null
  if (rows.length === 0) return null

  return (
    <div
      data-testid="home-ticker"
      style={{
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
        padding: '10px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'var(--bg-2)',
        flexWrap: 'wrap',
      }}
    >
      <span
        className="ui"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          flexShrink: 0,
        }}
      >
        ● Newly established
      </span>
      <div
        className="mono"
        style={{
          fontSize: 12,
          color: 'var(--ink-2)',
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        {rows.map((row) => (
          <a
            key={`${row.tickSlug}-${row.countyFips}`}
            href={pathFor('county', { state: row.stateSlug, slug: row.countySlug })}
            style={{
              color: 'inherit',
              textDecoration: 'none',
              borderBottom: '1px dotted var(--muted)',
            }}
          >
            {row.tickName} → {row.countyName}, {row.stateCode}
          </a>
        ))}
      </div>
    </div>
  )
}
