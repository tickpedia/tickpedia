import { pathFor } from '../../../routes/index.js'
import type { StateTickRow } from '../data/useStateTicks.js'

// "Ticks established here" — same monogram-card rail as the tick
// page's DiseasesSection. Each card links to /ticks/[slug]; a small
// prevalence chip carries the editorial signal from `tick_state`.

export interface TicksSectionProps {
  rows: readonly StateTickRow[]
  loading: boolean
  error: Error | null
  stateName: string
  anchorId?: string
}

export function TicksSection({
  rows,
  loading,
  error,
  stateName,
  anchorId = 'ticks',
}: TicksSectionProps) {
  return (
    <section id={anchorId} className="tp-section" data-testid="state-ticks">
      <div className="head">
        <h2 className="tp-serif">Ticks established here</h2>
        <span className="meta">{loading ? 'loading…' : `${rows.length} species`}</span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load tick list: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No tick species established in {stateName} yet — surveillance ongoing.
        </p>
      )}

      {!error && rows.length > 0 && (
        <ul
          data-testid="state-tick-rail"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {rows.map((row) => (
            <li key={row.id}>
              <TickCard row={row} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TickCard({ row }: { row: StateTickRow }) {
  const letter = (row.commonName.trim()[0] ?? '?').toUpperCase()
  return (
    <a
      href={pathFor('tick', { slug: row.slug })}
      className="hairline"
      style={{
        display: 'grid',
        gridTemplateColumns: '48px minmax(0, 1fr)',
        gap: 14,
        alignItems: 'center',
        padding: '12px 14px',
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--surface)',
      }}
    >
      <span
        aria-hidden="true"
        className="hairline"
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Newsreader, serif',
          fontSize: 24,
          lineHeight: 1,
          color: 'var(--ink)',
        }}
      >
        {letter}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          className="tp-serif"
          style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.2 }}
        >
          {row.commonName}
        </div>
        <div
          className="tp-serif"
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            fontStyle: 'italic',
            marginTop: 2,
          }}
        >
          {row.scientificName}
        </div>
        <div
          className="ui"
          style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}
        >
          {row.prevalence && (
            <span
              className="tp-chip"
              style={{ fontSize: 10, color: 'var(--muted)' }}
              title="Editorial prevalence in this state"
            >
              {row.prevalence}
            </span>
          )}
          {row.peakMonths && row.peakMonths.length > 0 && (
            <span
              className="tp-chip"
              style={{ fontSize: 10, color: 'var(--muted)' }}
              title="Peak activity months"
            >
              peak · {formatMonthRange(row.peakMonths)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

function formatMonthRange(months: readonly number[]): string {
  if (months.length === 0) return ''
  const sorted = [...months].sort((a, b) => a - b)
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  if (first === last) return MONTH_NAMES[first - 1] ?? String(first)
  return `${MONTH_NAMES[first - 1] ?? first}–${MONTH_NAMES[last - 1] ?? last}`
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
