import { pathFor } from '../../../routes/index.js'
import type {
  TickTechniqueRow,
  TickTechniqueBuckets,
} from '../data/useTickTechniques.js'

// "Remove · Prevent · After a bite" rail family. Three editorial rails
// rendered conditionally — each only shows when the linked technique
// pool actually has entries of that kind. Prevention cards carry a
// 0-10 impact scale and the strongest source domain.

export interface TechniquesSectionProps {
  buckets: TickTechniqueBuckets
  loading: boolean
  error: Error | null
}

export function TechniquesSection({ buckets, loading, error }: TechniquesSectionProps) {
  const total =
    buckets.removal.length +
    buckets.prevention.length +
    buckets.aftercare.length +
    buckets.diagnostic.length

  return (
    <section
      id="techniques"
      className="tp-section"
      data-testid="tick-techniques-section"
    >
      <div className="head">
        <h2 className="tp-serif">Remove, prevent, and what to do after</h2>
        <span className="meta">
          {loading ? 'loading…' : `${total} ${total === 1 ? 'entry' : 'entries'}`}
        </span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load techniques: {error.message}
        </p>
      )}

      {!error && !loading && total === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No removal or prevention guidance is mapped to this tick yet.
          Browse the{' '}
          <a href="/techniques" data-testid="tick-techniques-fallback-link">
            full techniques index
          </a>{' '}
          for general advice.
        </p>
      )}

      {!error && total > 0 && (
        <div style={{ display: 'grid', gap: 24 }}>
          {buckets.removal.length > 0 && (
            <Rail
              testId="tick-techniques-removal"
              title="How to remove this tick"
              eyebrow="Removal · field method"
              rows={buckets.removal}
            />
          )}
          {buckets.prevention.length > 0 && (
            <Rail
              testId="tick-techniques-prevention"
              title="Keep it from biting in the first place"
              eyebrow="Prevention · ranked by impact"
              rows={buckets.prevention}
              showScore
            />
          )}
          {buckets.aftercare.length > 0 && (
            <Rail
              testId="tick-techniques-aftercare"
              title="After the bite"
              eyebrow="Aftercare · what to watch"
              rows={buckets.aftercare}
            />
          )}
          {buckets.diagnostic.length > 0 && (
            <Rail
              testId="tick-techniques-diagnostic"
              title="If you need a test"
              eyebrow="Diagnostic · lab path"
              rows={buckets.diagnostic}
            />
          )}
        </div>
      )}
    </section>
  )
}

interface RailProps {
  testId: string
  title: string
  eyebrow: string
  rows: readonly TickTechniqueRow[]
  showScore?: boolean
}

function Rail({ testId, title, eyebrow, rows, showScore }: RailProps) {
  return (
    <div data-testid={testId}>
      <div className="ui eyebrow" style={{ marginBottom: 6 }}>
        {eyebrow}
      </div>
      <h3 className="tp-serif" style={{ fontSize: 22, margin: '0 0 12px' }}>
        {title}
      </h3>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {rows.map((row) => (
          <li key={row.id}>
            <TechniqueCard row={row} showScore={showScore ?? false} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function TechniqueCard({
  row,
  showScore,
}: {
  row: TickTechniqueRow
  showScore: boolean
}) {
  const sourceLabel =
    row.citations[0] ?? row.sourceUrl
      ? hostnameFor(row.citations[0] ?? row.sourceUrl ?? '')
      : null
  return (
    <a
      href={pathFor('technique', { slug: row.slug })}
      className="hairline"
      data-testid={`tick-technique-card-${row.slug}`}
      style={{
        display: 'grid',
        gap: 8,
        padding: '14px 16px',
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--surface)',
      }}
    >
      <span
        className="tp-serif"
        style={{ fontSize: 17, lineHeight: 1.3, color: 'var(--ink)' }}
      >
        {row.title}
      </span>
      {row.oneLiner && (
        <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          {row.oneLiner}
        </span>
      )}
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {showScore && row.preventionScore !== null && (
          <PreventionPip score={row.preventionScore} />
        )}
        {sourceLabel && <span>{sourceLabel}</span>}
      </div>
    </a>
  )
}

function PreventionPip({ score }: { score: number }) {
  return (
    <span
      data-testid="tick-technique-score-pip"
      data-score={score}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'var(--bg)',
        border: '1px solid var(--rule)',
        color: 'var(--ink-2)',
        fontSize: 11,
      }}
    >
      <span aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 4,
              height: 8,
              marginRight: i < 9 ? 1 : 0,
              borderRadius: 1,
              background: i < score ? 'var(--accent)' : 'var(--rule)',
              verticalAlign: 'middle',
            }}
          />
        ))}
      </span>
      <span>{score}/10</span>
    </span>
  )
}

function hostnameFor(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return 'source'
  }
}
