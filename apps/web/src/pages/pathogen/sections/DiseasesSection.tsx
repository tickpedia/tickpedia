import { pathFor } from '../../../routes/index.js'
import type { PathogenDiseaseRow } from '../data/usePathogenDiseases.js'

// "Diseases this pathogen causes" — mirror of disease's TicksSection
// shape, flipped: rows of name + oneLiner linking to /diseases/[slug].

export interface DiseasesSectionProps {
  rows: readonly PathogenDiseaseRow[]
  loading: boolean
  error: Error | null
  pathogenName: string
  anchorId?: string
}

export function DiseasesSection({
  rows,
  loading,
  error,
  pathogenName,
  anchorId = 'diseases',
}: DiseasesSectionProps) {
  return (
    <section id={anchorId} className="tp-section" data-testid="pathogen-diseases">
      <div className="head">
        <h2 className="tp-serif">Diseases it causes</h2>
        <span className="meta">{loading ? 'loading…' : `${rows.length} known`}</span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load disease list: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          {pathogenName} not yet wired to a disease in the lens.
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
