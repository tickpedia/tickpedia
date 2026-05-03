import { pathFor } from '../../../routes/index.js'
import type { RiskHotspotRow } from '../data/useRiskHotspots.js'

// Top-12 county hotspot leaderboard. Three-column grid at desktop,
// collapses to one column under ~640px via auto-fit. Each row links
// to the county page (/counties/[state]/[slug]).

export interface HotspotsSectionProps {
  rows: ReadonlyArray<RiskHotspotRow>
  loading: boolean
}

export function HotspotsSection({ rows, loading }: HotspotsSectionProps) {
  if (loading) {
    return (
      <section className="tp-section" data-testid="risk-hotspots">
        <div className="head">
          <h2 className="tp-serif">Top hotspots</h2>
          <span className="meta">loading…</span>
        </div>
      </section>
    )
  }

  if (rows.length === 0) {
    return (
      <section className="tp-section" data-testid="risk-hotspots">
        <div className="head">
          <h2 className="tp-serif">Top hotspots</h2>
        </div>
        <p className="ui" style={{ color: 'var(--ink-2)', fontSize: 14 }}>
          County-level data not yet imported.
        </p>
      </section>
    )
  }

  return (
    <section className="tp-section" data-testid="risk-hotspots">
      <div className="head">
        <h2 className="tp-serif">Top hotspots</h2>
        <span className="meta">{rows.length} counties · cumulative cases</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 10,
        }}
      >
        {rows.map((row, idx) => (
          <a
            key={row.fips}
            href={pathFor('county', { state: row.stateSlug, slug: row.slug })}
            className="hairline ui"
            style={{
              padding: '12px 14px',
              color: 'var(--ink)',
              textDecoration: 'none',
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: 6,
            }}
          >
            <span style={{ display: 'flex', gap: 10, alignItems: 'baseline', minWidth: 0 }}>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  width: 22,
                  flexShrink: 0,
                }}
              >
                {(idx + 1).toString().padStart(2, '0')}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="tp-serif" style={{ fontSize: 16 }}>
                  {row.countyName}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--muted)',
                    marginLeft: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  {row.stateCode}
                </span>
              </span>
            </span>
            <span className="mono" style={{ fontSize: 13 }}>
              {row.total.toLocaleString()}
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
