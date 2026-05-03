import { pathFor } from '../../../routes/index.js'
import type { StateCountyHotspotRow } from '../data/useStateCountyHotspots.js'
import type { StateRow } from '../data/useStateRow.js'

// "Worst counties" leaderboard, top 12 by cumulative tick-borne
// disease load. We frame this as epidemiology, not stigma — note in
// the meta line and the design's methodology callout.

export interface CountyHotspotsSectionProps {
  state: StateRow
  rows: readonly StateCountyHotspotRow[]
  loading: boolean
  error: Error | null
  anchorId?: string
}

export function CountyHotspotsSection({
  state,
  rows,
  loading,
  error,
  anchorId = 'counties',
}: CountyHotspotsSectionProps) {
  return (
    <section id={anchorId} className="tp-section" data-testid="state-county-hotspots">
      <div className="head">
        <h2 className="tp-serif">Worst counties · cumulative disease load</h2>
        <span className="meta">
          {loading ? 'loading…' : `top ${rows.length}`}
        </span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load county leaderboard: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No CDC-reported cases yet for any county in {state.name}.
        </p>
      )}

      {!error && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
        <table className="tp-table" data-testid="state-county-hotspots-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>County</th>
              <th className="num">Total cases</th>
              <th className="num">Diseases</th>
              <th className="num">Latest year</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.fips}>
                <td className="mono">{String(i + 1).padStart(2, '0')}</td>
                <td>
                  {row.slug ? (
                    <a
                      href={pathFor('county', { state: state.slug, slug: row.slug })}
                      style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                    >
                      {row.countyName}
                    </a>
                  ) : (
                    <span
                      className="tp-serif"
                      style={{ fontSize: 16, color: 'var(--muted)' }}
                    >
                      {row.countyName}
                    </span>
                  )}
                </td>
                <td className="num">{row.total.toLocaleString()}</td>
                <td className="num">{row.diseases || '—'}</td>
                <td className="num">{row.mostRecentYear || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <p
          className="ui"
          style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, fontStyle: 'italic', maxWidth: 700 }}
        >
          We frame this as epidemiology, not stigma — high-load counties are
          places with higher tick density and reporting completeness, not
          worse places to live.
        </p>
      )}
    </section>
  )
}
