import type { DiseasePathogenRow } from '../data/useDiseasePathogens.js'

// "Pathogens that cause this disease" — the etiological-agent rail.
// Each row links to /pathogens/[slug]; until phase 5b ships, the
// alias map + the SPA fallback handle those URLs.

export interface PathogensSectionProps {
  rows: readonly DiseasePathogenRow[]
  loading: boolean
  error: Error | null
  diseaseName: string
  anchorId?: string
}

export function PathogensSection({
  rows,
  loading,
  error,
  diseaseName,
  anchorId = 'pathogens',
}: PathogensSectionProps) {
  return (
    <section id={anchorId} className="tp-section" data-testid="disease-pathogens">
      <div className="head">
        <h2 className="tp-serif">Pathogens that cause it</h2>
        <span className="meta">{loading ? 'loading…' : `${rows.length} known`}</span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load pathogen list: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          Pathogen association not yet seeded for {diseaseName}.
        </p>
      )}

      {!error && rows.length > 0 && (
        <table className="tp-table">
          <thead>
            <tr>
              <th>Pathogen</th>
              <th>Scientific name</th>
              <th>One-liner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <a
                    href={`/pathogens/${row.slug}`}
                    style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                  >
                    {row.displayName}
                  </a>
                </td>
                <td
                  style={{
                    color: 'var(--muted)',
                    fontStyle: 'italic',
                    fontFamily: 'Newsreader, serif',
                  }}
                >
                  {row.scientificName}
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
