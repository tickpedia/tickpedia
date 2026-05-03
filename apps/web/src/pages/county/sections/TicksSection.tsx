import { pathFor } from '../../../routes/index.js'
import type { CountyTickRow } from '../data/useCountyTicks.js'

// "Established ticks here" — same monogram-card rail used on the
// state page's TicksSection. Each card links to /ticks/[slug].

export interface TicksSectionProps {
  rows: readonly CountyTickRow[]
  loading: boolean
  error: Error | null
  countyDisplayName: string
  anchorId?: string
}

export function TicksSection({
  rows,
  loading,
  error,
  countyDisplayName,
  anchorId = 'ticks',
}: TicksSectionProps) {
  return (
    <section id={anchorId} className="tp-section" data-testid="county-ticks">
      <div className="head">
        <h2 className="tp-serif">Established ticks here</h2>
        <span className="meta">{loading ? 'loading…' : `${rows.length} species`}</span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load tick list: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No tick species reported in {countyDisplayName} yet.
        </p>
      )}

      {!error && rows.length > 0 && (
        <ul
          data-testid="county-tick-rail"
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

function TickCard({ row }: { row: CountyTickRow }) {
  const letter = (row.commonName.trim()[0] ?? '?').toUpperCase()
  const sinceLine = buildSince(row)
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
        <div className="tp-serif" style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.2 }}>
          {row.commonName}
        </div>
        <div
          className="tp-serif"
          style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}
        >
          {row.scientificName}
        </div>
        {sinceLine && (
          <div className="ui" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {sinceLine}
          </div>
        )}
      </div>
    </a>
  )
}

function buildSince(row: CountyTickRow): string | null {
  const status = row.status?.toLowerCase() ?? null
  if (!status) return null
  if (row.earliestYear) return `${status} · since ${row.earliestYear}`
  return status
}
