import { pathFor } from '../../../routes/index.js'
import type { StateDiseaseRow } from '../data/useStateDiseases.js'

// "Disease cases reported here" — sorted-by-total table. Each row
// links to /diseases/[slug] (the disease page already crops its own
// state choropleth to highlight this state when ranked highly).

export interface DiseasesSectionProps {
  rows: readonly StateDiseaseRow[]
  loading: boolean
  error: Error | null
  stateName: string
  anchorId?: string
}

export function DiseasesSection({
  rows,
  loading,
  error,
  stateName,
  anchorId = 'diseases',
}: DiseasesSectionProps) {
  return (
    <section id={anchorId} className="tp-section" data-testid="state-diseases">
      <div className="head">
        <h2 className="tp-serif">Disease cases reported here</h2>
        <span className="meta">
          {loading ? 'loading…' : `${rows.length} ${rows.length === 1 ? 'disease' : 'diseases'}`}
        </span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load disease list: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No CDC-reported disease cases in {stateName} for the available years.
        </p>
      )}

      {!error && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
        <table className="tp-table" data-testid="state-diseases-table">
          <thead>
            <tr>
              <th>Disease</th>
              <th className="num">Total cases</th>
              <th className="num">Counties</th>
              <th className="num">Years covered</th>
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
                  {row.oneLiner && (
                    <div className="ui" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {row.oneLiner}
                    </div>
                  )}
                </td>
                <td className="num">{row.total.toLocaleString()}</td>
                <td className="num">{row.counties || '—'}</td>
                <td className="num">{row.yearsCovered || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </section>
  )
}
