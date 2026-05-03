import { pathFor } from '../../../routes/index.js'
import type { RiskDiseaseRow } from '../data/useRiskDiseases.js'

// Disease filter chip rail. Inline (not a dropdown) — all 21
// diseases as chips; the rail wraps. The `activeSlug` chip carries
// `aria-current="page"`; a "Clear filter" chip links back to /risk
// when a disease is active.

export interface DiseaseChipsSectionProps {
  rows: ReadonlyArray<RiskDiseaseRow>
  activeSlug?: string | undefined
  loading: boolean
}

export function DiseaseChipsSection({
  rows,
  activeSlug,
  loading,
}: DiseaseChipsSectionProps) {
  if (loading) {
    return (
      <section className="tp-section" data-testid="risk-disease-chips">
        <div className="head">
          <h2 className="tp-serif">Filter by disease</h2>
          <span className="meta">loading…</span>
        </div>
      </section>
    )
  }

  if (rows.length === 0) return null

  return (
    <section className="tp-section" data-testid="risk-disease-chips">
      <div className="head">
        <h2 className="tp-serif">Filter by disease</h2>
        <span className="meta">{rows.length} reportable</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {activeSlug && (
          <a className="tp-chip tp-chip-link" href="/risk" data-testid="risk-clear-filter">
            ← All diseases
          </a>
        )}
        {rows.map((row) => (
          <a
            key={row.id}
            href={pathFor('risk-disease', { slug: row.slug })}
            className="tp-chip tp-chip-link"
            {...(activeSlug === row.slug ? { 'aria-current': 'page' } : {})}
          >
            {row.displayName}
          </a>
        ))}
      </div>
    </section>
  )
}
