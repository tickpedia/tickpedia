import { pathFor } from '../../../routes/index.js'
import type { TickDiseaseRow } from '../data/useTickDiseases.js'

// "Diseases this tick carries" — small clickable cards. Each card is
// an `<a>` to /diseases/[slug] and pairs a hairline-ringed monogram
// (matching the disease hero) with the displayName + oneLiner. The
// rail visually keeps pace with the disease page family that ships
// in phase 5.

export interface DiseasesSectionProps {
  rows: readonly TickDiseaseRow[]
  loading: boolean
  error: Error | null
}

export function DiseasesSection({ rows, loading, error }: DiseasesSectionProps) {
  return (
    <section id="diseases" className="tp-section">
      <div className="head">
        <h2 className="tp-serif">Diseases it carries</h2>
        <span className="meta">{loading ? 'loading…' : `${rows.length} known`}</span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load disease list: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No diseases on record for this tick yet.
        </p>
      )}

      {!error && rows.length > 0 && (
        <ul
          data-testid="disease-rail"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {rows.map((row) => (
            <li key={row.id}>
              <DiseaseCard row={row} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DiseaseCard({ row }: { row: TickDiseaseRow }) {
  const letter = (row.displayName.trim()[0] ?? '?').toUpperCase()
  return (
    <a
      href={pathFor('disease', { slug: row.slug })}
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
      <span style={{ display: 'block' }}>
        <span
          style={{
            fontFamily: 'Newsreader, serif',
            fontSize: 17,
            color: 'var(--ink)',
            display: 'block',
          }}
        >
          {row.displayName}
        </span>
        {row.oneLiner && (
          <span
            style={{
              display: 'block',
              fontSize: 13,
              color: 'var(--ink-2)',
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {row.oneLiner}
          </span>
        )}
      </span>
    </a>
  )
}
