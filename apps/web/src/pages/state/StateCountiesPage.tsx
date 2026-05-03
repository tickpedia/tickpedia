import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useStateRow } from './data/useStateRow.js'
import { useStateCounties } from './data/useStateCounties.js'
import { buildStateSubPageHead } from './seo.js'

// /states/[slug]/counties — alphabetical list of every county in
// this state. Each row links to /counties/[state-slug]/[county-slug];
// the alias-stub catches it until phase 8 ships the real page.

export interface StateCountiesPageProps {
  slug: string
}

export function StateCountiesPage({ slug }: StateCountiesPageProps) {
  const { state, status } = useStateRow(slug)
  const counties = useStateCounties(state?.fips ?? null)

  const head = state
    ? buildStateSubPageHead(state, 'Counties')
    : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/states/${slug}/counties` }

  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    ...(head.description ? { description: head.description } : {}),
  })

  if (status === 'not-found' || !state) {
    if (status === 'loading') {
      return (
        <Scaffold slug={slug}>
          <p className="ui" style={{ color: 'var(--muted)' }}>Loading state…</p>
        </Scaffold>
      )
    }
    return (
      <Scaffold slug={slug}>
        <h1 className="tp-serif" style={{ fontSize: 28, marginBottom: 12 }}>
          State not found
        </h1>
        <p className="tp-serif" style={{ color: 'var(--ink-2)' }}>
          Try the <a href="/states">states index</a>.
        </p>
      </Scaffold>
    )
  }

  return (
    <div className="tp-page" data-testid="state-counties-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'States', href: '/states' },
            { label: state.name, href: pathFor('state', { slug: state.slug }) },
            { label: 'Counties' },
          ]}
        />
      </div>
      <div style={{ padding: '20px 32px 0' }}>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            margin: '4px 0 6px',
          }}
        >
          Counties in {state.name}
        </h1>
      </div>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">All counties</h2>
          <span className="meta">
            {counties.loading
              ? 'loading…'
              : `${counties.rows.length} ${counties.rows.length === 1 ? 'county' : 'counties'}`}
          </span>
        </div>

        {counties.error && (
          <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Failed to load counties: {counties.error.message}
          </p>
        )}

        {!counties.error && !counties.loading && counties.rows.length === 0 && (
          <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
            Counties not yet imported for {state.name}.
          </p>
        )}

        {!counties.error && counties.rows.length > 0 && (
          <table className="tp-table" data-testid="state-counties-table">
            <thead>
              <tr>
                <th>County</th>
                <th>FIPS</th>
              </tr>
            </thead>
            <tbody>
              {counties.rows.map((row) => (
                <tr key={row.fips}>
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

function Scaffold({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'States', href: '/states' },
            { label: slug },
            { label: 'Counties' },
          ]}
        />
      </div>
      <div style={{ padding: '40px 32px' }}>{children}</div>
      <Footer />
    </div>
  )
}
