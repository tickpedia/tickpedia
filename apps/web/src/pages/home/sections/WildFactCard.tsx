import { pathFor } from '../../../routes/index.js'
import type { LatestFactRow } from '../data/useLatestFact.js'
import { citationHostname } from '../../fact/data/slug-title.js'

// Single-fact rotator card surfaced at the top of the home content
// strip. Hides cleanly when the feed has nothing to show.

export interface WildFactCardProps {
  fact: LatestFactRow | null
  loading: boolean
}

export function WildFactCard({ fact, loading }: WildFactCardProps) {
  if (loading) {
    return (
      <section className="tp-section" data-testid="home-wild-fact">
        <div className="head">
          <h2 className="tp-serif">Wild fact</h2>
          <span className="meta">loading…</span>
        </div>
      </section>
    )
  }

  if (!fact) return null

  const sourceLabel = fact.citationUrl ? citationHostname(fact.citationUrl) : null

  return (
    <section className="tp-section" data-testid="home-wild-fact">
      <div className="head">
        <h2 className="tp-serif">Wild fact</h2>
        <a className="ui meta" href="/facts">
          All facts →
        </a>
      </div>
      <a
        href={pathFor('fact', { slug: fact.slug })}
        className="hairline"
        style={{
          display: 'block',
          padding: 24,
          textDecoration: 'none',
          color: 'inherit',
          background: 'var(--surface)',
          borderRadius: 8,
        }}
      >
        <p
          className="tp-serif"
          style={{
            fontSize: 24,
            lineHeight: 1.3,
            letterSpacing: '-0.005em',
            margin: 0,
          }}
        >
          {fact.body}
        </p>
        <div
          className="ui"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 14,
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {sourceLabel ? <span>source · {sourceLabel}</span> : <span />}
          <span style={{ color: 'var(--accent)' }}>Read fact →</span>
        </div>
      </a>
    </section>
  )
}
