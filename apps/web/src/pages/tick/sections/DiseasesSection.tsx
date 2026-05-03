import { pathFor } from '../../../routes/index.js'
import type { TickDiseaseRow } from '../data/useTickDiseases.js'

// "Diseases this tick carries" — a linkable list. Each row navigates
// to the disease page once that page family ships; until then the
// router falls back to the legacy home with a "not yet shipped" hint.

export interface DiseasesSectionProps {
  rows: readonly TickDiseaseRow[]
  loading: boolean
  error: Error | null
}

export function DiseasesSection({ rows, loading, error }: DiseasesSectionProps) {
  return (
    <section className="tp-section">
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
        <table className="tp-table">
          <thead>
            <tr>
              <th>Disease</th>
              <th>One-liner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <a
                    href={pathFor('disease', { slug: row.slug })}
                    style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                  >
                    {row.displayName}
                  </a>
                </td>
                <td style={{ color: 'var(--ink-2)' }}>{row.oneLiner ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
