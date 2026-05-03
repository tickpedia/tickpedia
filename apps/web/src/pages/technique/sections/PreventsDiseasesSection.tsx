import { pathFor } from '../../../routes/index.js'
import type { TechniqueDiseaseRow } from '../data/useTechniqueDiseases.js'

// "Diseases this can help prevent" — derived through the tick →
// disease graph. Each chip links to /diseases/[slug]. The whole
// section hides when the derivation has no rows (the applies-to
// rail is empty too in that case).

export interface PreventsDiseasesSectionProps {
  rows: readonly TechniqueDiseaseRow[]
  loading: boolean
  error: Error | null
  anchorId?: string
}

const TOP_N = 12

export function PreventsDiseasesSection({
  rows,
  loading,
  error,
  anchorId = 'prevents',
}: PreventsDiseasesSectionProps) {
  if (error) {
    return (
      <section
        id={anchorId}
        className="tp-section"
        data-testid="technique-prevents"
      >
        <div className="head">
          <h2 className="tp-serif">Diseases this can help prevent</h2>
          <span className="meta">tickDiseases · derived</span>
        </div>
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load disease list: {error.message}
        </p>
      </section>
    )
  }

  // Hide the section entirely when there's nothing to derive from —
  // showing an empty rail with no copy would look like a bug.
  if (!loading && rows.length === 0) return null

  const visible = rows.slice(0, TOP_N)
  const overflow = Math.max(0, rows.length - visible.length)

  return (
    <section
      id={anchorId}
      className="tp-section"
      data-testid="technique-prevents"
    >
      <div className="head">
        <h2 className="tp-serif">Diseases this can help prevent</h2>
        <span className="meta">
          {loading ? 'loading…' : `${rows.length} known`}
        </span>
      </div>

      {!loading && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {visible.map((row) => (
            <a
              key={row.id}
              href={pathFor('disease', { slug: row.slug })}
              className="tp-chip tp-chip-link"
              title={row.oneLiner ?? row.displayName}
            >
              {row.displayName}
            </a>
          ))}
          {overflow > 0 && (
            <span className="tp-chip" style={{ color: 'var(--muted)' }}>
              +{overflow} more
            </span>
          )}
        </div>
      )}
    </section>
  )
}
