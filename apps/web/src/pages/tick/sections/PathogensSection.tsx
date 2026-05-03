import { pathFor } from '../../../routes/index.js'
import type { TickPathogenRow } from '../data/useTickPathogens.js'

// Phase 5b retro-fit: "Pathogens this tick carries" rail on the tick
// page, mirroring the disease page's PathogensSection table.

export interface PathogensSectionProps {
  rows: readonly TickPathogenRow[]
  loading: boolean
  error: Error | null
  tickName: string
}

export function PathogensSection({ rows, loading, error, tickName }: PathogensSectionProps) {
  return (
    <section id="pathogens" className="tp-section" data-testid="tick-pathogens">
      <div className="head">
        <h2 className="tp-serif">Pathogens it carries</h2>
        <span className="meta">{loading ? 'loading…' : `${rows.length} known`}</span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load pathogen list: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No pathogens linked to {tickName} in the lens yet.
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
                    href={pathFor('pathogen', { slug: row.slug })}
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
