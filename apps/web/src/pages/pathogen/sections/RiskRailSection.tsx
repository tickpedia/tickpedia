import { pathFor } from '../../../routes/index.js'
import type { PathogenDiseaseRow } from '../data/usePathogenDiseases.js'

// Sibling rail at the bottom of /pathogens/[slug]: one /risk/[disease-slug]
// chart-CTA card per disease this pathogen causes. We don't ship a
// /risk/[pathogen-slug] page (presence-only data, not density — see
// step 05 §G follow-up #9), so the heatmap CTA hangs off the diseases
// instead.

export interface RiskRailSectionProps {
  diseases: readonly PathogenDiseaseRow[]
  loading: boolean
}

export function RiskRailSection({ diseases, loading }: RiskRailSectionProps) {
  if (loading || diseases.length === 0) return null
  return (
    <section className="tp-section" data-testid="pathogen-risk-rail">
      <div className="head">
        <h2 className="tp-serif">Risk maps</h2>
        <span className="meta">H3 hexagon heatmap · per disease</span>
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {diseases.map((d) => (
          <li key={d.id}>
            <a
              href={pathFor('risk-disease', { slug: d.slug })}
              className="hairline"
              style={{
                display: 'block',
                padding: '14px 16px',
                textDecoration: 'none',
                color: 'inherit',
                background: 'var(--surface)',
              }}
            >
              <span
                className="ui eyebrow"
                style={{ display: 'block', marginBottom: 4 }}
              >
                Risk map
              </span>
              <span
                style={{
                  fontFamily: 'Newsreader, serif',
                  fontSize: 17,
                  display: 'block',
                  color: 'var(--ink)',
                }}
              >
                Where {d.displayName} hits hardest →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
