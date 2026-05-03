import { pathFor } from '../../../routes/index.js'
import type { DiseaseTickRow } from '../data/useDiseaseTicks.js'

// "Ticks that carry this disease" — mirror of TickPage's
// DiseasesSection. A linkable table; each row points at /ticks/[slug].

export interface TicksSectionProps {
  rows: readonly DiseaseTickRow[]
  loading: boolean
  error: Error | null
  diseaseName: string
  anchorId?: string
}

export function TicksSection({
  rows,
  loading,
  error,
  diseaseName,
  anchorId = 'ticks',
}: TicksSectionProps) {
  return (
    <section id={anchorId} className="tp-section" data-testid="disease-ticks">
      <div className="head">
        <h2 className="tp-serif">Ticks that carry it</h2>
        <span className="meta">{loading ? 'loading…' : `${rows.length} known`}</span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load tick list: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No ticks linked to {diseaseName} in the lens — check the editorial seed.
        </p>
      )}

      {!error && rows.length > 0 && (
        <table className="tp-table">
          <thead>
            <tr>
              <th>Tick</th>
              <th>Scientific name</th>
              <th>One-liner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <a
                    href={pathFor('tick', { slug: row.slug })}
                    style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                  >
                    {row.commonName}
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
