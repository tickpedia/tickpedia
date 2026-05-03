import { pathFor } from '../../../routes/index.js'
import type { CountyDiseaseRow } from '../data/useCountyDiseases.js'

// "Disease totals · cumulative" — top-N diseases for this county
// rendered as a horizontal bar list. Each row's label is a link to
// /diseases/[slug]; the bar's width is proportional to the row's
// total relative to the highest-total row.

export interface DiseaseBarsSectionProps {
  rows: readonly CountyDiseaseRow[]
  loading: boolean
  error: Error | null
  countyDisplayName: string
  anchorId?: string
}

const TOP_N = 5

export function DiseaseBarsSection({
  rows,
  loading,
  error,
  countyDisplayName,
  anchorId = 'diseases',
}: DiseaseBarsSectionProps) {
  const visible = rows.slice(0, TOP_N)
  const max = Math.max(...visible.map((r) => r.total), 1)

  return (
    <section id={anchorId} className="tp-section" data-testid="county-diseases">
      <div className="head">
        <h2 className="tp-serif">Disease totals · cumulative</h2>
        <span className="meta">
          {loading ? 'loading…' : `top ${visible.length}`}
        </span>
      </div>

      {error && (
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load disease totals: {error.message}
        </p>
      )}

      {!error && !loading && rows.length === 0 && (
        <p className="tp-serif" style={{ color: 'var(--muted)', fontSize: 14 }}>
          No CDC-reported cases yet for {countyDisplayName}.
        </p>
      )}

      {!error && visible.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {visible.map((row) => {
            const pct = (row.total / max) * 100
            return (
              <li key={row.id}>
                <a
                  href={pathFor('disease', { slug: row.slug })}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 200px) minmax(0, 1fr) 80px',
                    gap: 12,
                    alignItems: 'center',
                    padding: '6px 0',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span
                    className="tp-serif"
                    style={{ fontSize: 15, color: 'var(--ink)' }}
                  >
                    {row.displayName}
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      height: 10,
                      background: 'var(--rule)',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${pct}%`,
                        background: 'var(--accent)',
                      }}
                    />
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-2)',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {row.total.toLocaleString()}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
