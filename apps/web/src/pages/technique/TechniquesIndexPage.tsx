import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useTechniquesIndex } from './data/useTechniquesIndex.js'
import { buildTechniquesIndexHead } from './seo.js'

// /techniques — flat alphabetical index. No sub-category grouping
// (the lens has no `category` field; logged in the brief's
// follow-ups). Pagination kicks in past ~30 entries; we're at ~4.

export function TechniquesIndexPage() {
  const head = buildTechniquesIndexHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const { rows, loading, error } = useTechniquesIndex()

  return (
    <div className="tp-page" data-testid="techniques-index-page">
      <PageHeader active="techniques" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Techniques' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 24px' }}>
        <div className="ui eyebrow">Removal & prevention</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(34px, 6vw, 52px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            margin: '8px 0 6px',
          }}
        >
          Techniques
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          How to take a tick off, when to see a doctor, and the
          field-tested guidance that goes with each. Sourced from the
          CDC and the ticks-and-pathogens literature.
        </p>
      </div>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">All techniques</h2>
          <span className="meta">
            {loading
              ? 'loading…'
              : `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}
          </span>
        </div>

        {error && (
          <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Failed to load index: {error.message}
          </p>
        )}

        {!error && rows.length > 0 && (
          <table className="tp-table" data-testid="techniques-index-table">
            <thead>
              <tr>
                <th>Technique</th>
                <th>One-liner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <a
                      href={pathFor('technique', { slug: row.slug })}
                      style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                    >
                      {row.title}
                    </a>
                  </td>
                  <td style={{ color: 'var(--ink-2)' }}>{row.oneLiner ?? '—'}</td>
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
