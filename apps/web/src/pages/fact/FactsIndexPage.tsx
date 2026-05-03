import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useFactsIndex, type FactsIndexRow } from './data/useFactsIndex.js'
import { titleizeSlug, citationHostname, clampBody } from './data/slug-title.js'
import { buildFactsIndexHead } from './seo.js'

// /facts — paginated wild-facts index, page 1 emitted at build time.
// Each row: humanized slug as H3 (linked), preview text, inline
// entity chips for cross-links. Empty seed renders a friendly
// fallback that links to the entity indexes.

export function FactsIndexPage() {
  const head = buildFactsIndexHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const { rows, loading, error } = useFactsIndex()

  return (
    <div className="tp-page" data-testid="facts-index-page">
      <PageHeader active="facts" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Wild facts' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 24px' }}>
        <div className="ui eyebrow">Editorial</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(34px, 6vw, 52px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            margin: '8px 0 6px',
          }}
        >
          Wild facts
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          Short, sourced facts about ticks, the diseases they carry, and how to
          remove them. Each fact links to the species, condition, or technique
          it concerns.
        </p>
      </div>

      {error && (
        <div style={{ padding: '0 32px 24px' }}>
          <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Failed to load facts: {error.message}
          </p>
        </div>
      )}

      {!error && !loading && rows.length === 0 && <EmptyState />}

      {!error && rows.length > 0 && (
        <section className="tp-section" data-testid="facts-index-list">
          <div className="head">
            <h2 className="tp-serif">Latest</h2>
            <span className="meta">
              {loading
                ? 'loading…'
                : `${rows.length} ${rows.length === 1 ? 'fact' : 'facts'}`}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}

function Row({ row }: { row: FactsIndexRow }) {
  const headline = titleizeSlug(row.slug)
  const preview = clampBody(row.body, 200)
  const citationLabel = row.citationUrl ? citationHostname(row.citationUrl) : null
  const overflow = row.totalRefs - row.chips.length
  return (
    <article
      data-testid="facts-index-row"
      style={{
        padding: '20px 0',
        borderTop: '1px solid var(--hairline)',
      }}
    >
      <h3 className="tp-serif" style={{ fontSize: 22, lineHeight: 1.15, margin: '0 0 8px' }}>
        <a
          href={pathFor('fact', { slug: row.slug })}
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          {headline}
        </a>
      </h3>
      {preview && (
        <p
          className="tp-serif"
          style={{
            fontSize: 15,
            color: 'var(--ink-2)',
            margin: '0 0 10px',
            maxWidth: 720,
          }}
        >
          {preview}
        </p>
      )}
      {(row.chips.length > 0 || citationLabel) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
          }}
        >
          {row.chips.map((chip) => (
            <a
              key={`${chip.kind}:${chip.slug}`}
              href={pathFor(chip.kind, { slug: chip.slug })}
              className="tp-chip tp-chip-link"
            >
              {chip.label}
            </a>
          ))}
          {overflow > 0 && (
            <span
              className="tp-chip"
              style={{ color: 'var(--ink-2)' }}
            >
              +{overflow} more
            </span>
          )}
          {citationLabel && (
            <span
              className="mono"
              style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}
            >
              source · {citationLabel}
            </span>
          )}
        </div>
      )}
    </article>
  )
}

function EmptyState() {
  return (
    <div style={{ padding: '0 32px 24px', maxWidth: 640 }}>
      <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)' }}>
        No facts yet — the editorial pass will fill this index. In the
        meantime, browse the indexes for{' '}
        <a href="/ticks">ticks</a>, <a href="/diseases">diseases</a>, and{' '}
        <a href="/techniques">techniques</a>.
      </p>
    </div>
  )
}
