import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useStatesIndex } from './data/useStatesIndex.js'
import { buildStatesIndexHead } from './seo.js'

// /states — alphabetical index of every U.S. state row. The design's
// 50-state choropleth is a phase-10 artefact (it needs a state-level
// color metric); the index ships as a flat alphabetical table for now.

export function StatesIndexPage() {
  const head = buildStatesIndexHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const { rows, loading, error } = useStatesIndex()

  return (
    <div className="tp-page" data-testid="states-index-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'States' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 24px' }}>
        <div className="ui eyebrow">United States</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(34px, 6vw, 52px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            margin: '8px 0 6px',
          }}
        >
          States
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          Tick distribution and disease cases for every U.S. state. Pick a
          state to see established species, CDC-reported totals, and a
          county-level breakdown.
        </p>
      </div>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">All states</h2>
          <span className="meta">
            {loading
              ? 'loading…'
              : `${rows.length} ${rows.length === 1 ? 'state' : 'states'}`}
          </span>
        </div>

        {error && (
          <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Failed to load index: {error.message}
          </p>
        )}

        {!error && rows.length > 0 && (
          <table className="tp-table" data-testid="states-index-table">
            <thead>
              <tr>
                <th>State</th>
                <th>USPS</th>
                <th>FIPS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.fips}>
                  <td>
                    <a
                      href={pathFor('state', { slug: row.slug })}
                      style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                    >
                      {row.name}
                    </a>
                  </td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>
                    {row.code}
                  </td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>
                    {row.fips}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Footer />
    </div>
  )
}
