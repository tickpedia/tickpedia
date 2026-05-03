import type { RelatedFactRow } from '../data/useFactRelated.js'
import { titleizeSlug, citationHostname, clampBody } from '../data/slug-title.js'
import { pathFor } from '../../../routes/index.js'

// "More like this" rail — feed.relatedTo results, semantic similarity
// against the seed fact's stored embedding. Hides cleanly when empty
// (no padding with recency-fallback rows; sparse data reads as
// honest, not broken).

export interface RelatedSectionProps {
  rows: ReadonlyArray<RelatedFactRow>
  loading: boolean
}

export function RelatedSection({ rows, loading }: RelatedSectionProps) {
  if (loading) {
    return (
      <section className="tp-section" data-testid="fact-related">
        <div className="head">
          <h2 className="tp-serif">Related facts</h2>
          <span className="meta">loading…</span>
        </div>
      </section>
    )
  }

  if (rows.length === 0) return null

  return (
    <section className="tp-section" data-testid="fact-related">
      <div className="head">
        <h2 className="tp-serif">Related facts</h2>
        <span className="meta">
          {rows.length} {rows.length === 1 ? 'fact' : 'facts'} · semantic similarity
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {rows.map((row) => (
          <RelatedCard key={row.id} row={row} />
        ))}
      </div>
    </section>
  )
}

function RelatedCard({ row }: { row: RelatedFactRow }) {
  const title = titleizeSlug(row.slug)
  const monogram = (row.slug.trim()[0] ?? '?').toUpperCase()
  const preview = clampBody(row.body, 140)
  const citationLabel = row.citationUrl ? citationHostname(row.citationUrl) : null
  return (
    <a
      href={pathFor('fact', { slug: row.slug })}
      className="hairline"
      data-testid="fact-related-card"
      style={{
        padding: 16,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--surface)',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          className="hairline tp-serif"
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            fontSize: 14,
            color: 'var(--ink)',
          }}
        >
          {monogram}
        </span>
        <h3
          className="tp-serif"
          style={{
            fontSize: 16,
            lineHeight: 1.2,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </h3>
      </div>
      <p
        className="tp-serif"
        style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}
      >
        {preview}
      </p>
      {citationLabel && (
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--muted)',
            paddingTop: 8,
            borderTop: '1px solid var(--hairline)',
          }}
        >
          source · {citationLabel}
        </div>
      )}
    </a>
  )
}
