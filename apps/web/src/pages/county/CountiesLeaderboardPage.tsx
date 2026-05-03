import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useCountiesLeaderboard } from './data/useCountiesLeaderboard.js'
import { buildCountiesLeaderboardHead } from './seo.js'
import { formatCountyName } from './data/county-name.js'

// /counties — top-100 hotspots leaderboard. The "Worst tick counties
// in America" board the brief promises. Every county and every state
// in the top-100 is rendered as a link, per the §B3 internal-linking
// density rule.

export function CountiesLeaderboardPage() {
  const head = buildCountiesLeaderboardHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const { rows, loading, error } = useCountiesLeaderboard()

  return (
    <div className="tp-page" data-testid="counties-leaderboard-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Counties' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 24px' }}>
        <div className="ui eyebrow">Cumulative tick-borne disease load</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(34px, 6vw, 52px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            margin: '8px 0 6px',
          }}
        >
          Top-100 counties
        </h1>
        <p
          className="tp-serif"
          style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}
        >
          The 100 U.S. counties with the highest cumulative CDC-reported
          tick-borne disease cases. We frame this as epidemiology, not
          stigma — high-load counties are places with higher tick density
          and reporting completeness, not worse places to live.
        </p>
      </div>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">Hotspots</h2>
          <span className="meta">
            {loading ? 'loading…' : `${rows.length} counties`}
          </span>
        </div>

        {error && (
          <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Failed to load leaderboard: {error.message}
          </p>
        )}

        {!error && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="tp-table" data-testid="counties-leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>County</th>
                  <th>State</th>
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
                      {row.stateSlug && row.slug ? (
                        <a
                          href={pathFor('county', { state: row.stateSlug, slug: row.slug })}
                          style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                        >
                          {formatCountyName(row.countyName)}
                        </a>
                      ) : (
                        <span
                          className="tp-serif"
                          style={{ fontSize: 16, color: 'var(--muted)' }}
                        >
                          {formatCountyName(row.countyName)}
                        </span>
                      )}
                    </td>
                    <td>
                      {row.stateSlug ? (
                        <a
                          href={pathFor('state', { slug: row.stateSlug })}
                          className="mono"
                          style={{ fontSize: 12 }}
                        >
                          {row.stateCode || row.stateSlug}
                        </a>
                      ) : (
                        <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                          —
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
      </section>

      <Footer />
    </div>
  )
}
