import type { HomeStats } from '../data/useHomeStats.js'

// Single-line stats footer with real row counts. Renders gracefully
// during loading by substituting "—" for any unresolved count.

export interface StatsFooterProps {
  stats: HomeStats | null
}

export function StatsFooter({ stats }: StatsFooterProps) {
  const ticks = stats ? formatCount(stats.ticks) : '—'
  const diseases = stats ? formatCount(stats.diseases) : '—'
  const counties = stats ? formatCount(stats.counties) : '—'
  const cases = stats ? formatCount(stats.caseRows) : '—'

  return (
    <div
      data-testid="home-stats-footer"
      className="ui"
      style={{
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'var(--muted)',
        fontSize: 11,
        letterSpacing: '0.06em',
        flexWrap: 'wrap',
        gap: 12,
        borderTop: '1px solid var(--rule)',
      }}
    >
      <span>MIT licensed · sources cited · no tracking · no cookies</span>
      <span className="mono">
        {ticks} ticks · {diseases} diseases · {counties} counties · {cases} case-rows
      </span>
    </div>
  )
}

function formatCount(n: number): string {
  return n.toLocaleString()
}
