import { pathFor } from '../../../routes/index.js'

// Flagship CTA card pointing at /risk/[slug] — the H3 hexagon
// risk map filtered to this disease. Designed to look like a chart
// affordance, not a footer link, per the brief.

export interface RiskCtaSectionProps {
  diseaseSlug: string
  diseaseName: string
  /** Number of states with reported cases — used as the "where" headline. */
  stateCount: number | null
  /** Total reported cases across the time series. */
  totalCases: number | null
}

export function RiskCtaSection({
  diseaseSlug,
  diseaseName,
  stateCount,
  totalCases,
}: RiskCtaSectionProps) {
  const riskPath = pathFor('risk-disease', { slug: diseaseSlug })

  return (
    <section
      className="tp-section"
      data-testid="disease-risk-cta"
      style={{ marginTop: 8 }}
    >
      <a
        href={riskPath}
        className="hairline"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 24,
          alignItems: 'center',
          padding: '20px 24px',
          textDecoration: 'none',
          color: 'inherit',
          background: 'var(--surface)',
        }}
      >
        <div>
          <div className="ui eyebrow" style={{ marginBottom: 6 }}>
            Continental risk map
          </div>
          <div
            className="tp-serif"
            style={{ fontSize: 22, lineHeight: 1.2, color: 'var(--ink)' }}
          >
            Where {diseaseName} hits hardest
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              color: 'var(--ink-2)',
              fontFamily: 'Newsreader, serif',
            }}
          >
            {summary(diseaseName, stateCount, totalCases)}
          </div>
        </div>
        <div className="ui" style={{ fontSize: 14, color: 'var(--accent)' }}>
          View risk map →
        </div>
      </a>
    </section>
  )
}

function summary(
  diseaseName: string,
  stateCount: number | null,
  totalCases: number | null,
): string {
  if (totalCases !== null && totalCases > 0 && stateCount !== null && stateCount > 0) {
    return `H3 hexagon heatmap of ${totalCases.toLocaleString()} reported ${totalCases === 1 ? 'case' : 'cases'} across ${stateCount} ${stateCount === 1 ? 'state' : 'states'}.`
  }
  return `Hexagon heatmap of where ${diseaseName} concentrates — county-level CDC reports bucketed into H3 cells.`
}
