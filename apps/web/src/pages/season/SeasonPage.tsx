import { PageHeader, Footer, useDocumentHead } from '../shared/index.js'
import { useSeasonality } from './data/useSeasonality.js'
import { useRiskDiseases } from '../risk/data/useRiskDiseases.js'
import { RadialSeasonChart } from './sections/RadialSeasonChart.js'
import { PerDiseasePeakList } from './sections/PerDiseasePeakList.js'
import { buildSeasonHead } from './seo.js'

// /season — when is tick season? Radial monthly chart driven by the
// `diseaseMonth.seasonality` lens, plus a per-disease peak list. The
// disease catalog is shared with /risk (same `useRiskDiseases` hook).

export function SeasonPage() {
  const head = buildSeasonHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const seasonality = useSeasonality()
  const diseases = useRiskDiseases()

  const cumulative = seasonality.data?.cumulativeByMonth ?? new Array<number>(12).fill(0)
  const perDisease = seasonality.data?.perDisease ?? []

  const totalCases = cumulative.reduce((acc, n) => acc + n, 0)

  return (
    <div className="tp-page" data-testid="season-page">
      <PageHeader active="risk" />

      <div style={{ padding: '44px 32px 12px' }}>
        <div className="ui eyebrow">CDC monthly counts · cumulative</div>
        <h1 className="tp-serif" style={{ fontSize: 44, lineHeight: 1.05, margin: '8px 0 12px' }}>
          When is tick season?
        </h1>
        <p className="tp-serif lede" style={{ maxWidth: 720 }}>
          Most tick-borne disease cases land in summer — but the curve isn't
          the same for every disease. Lyme is a June peak; anaplasmosis
          stretches into the fall. Here are the monthly CDC counts, summed.
        </p>
      </div>

      <section className="tp-section" data-testid="season-radial">
        <div className="head">
          <h2 className="tp-serif">Monthly seasonality</h2>
          <span className="meta">
            {seasonality.loading
              ? 'loading…'
              : `${totalCases.toLocaleString()} reported cases`}
          </span>
        </div>
        <RadialSeasonChart
          cumulativeByMonth={cumulative}
          ariaLabel="Cumulative tick-borne disease cases by month"
        />
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          peak month highlighted · radial extent ∝ case count
        </p>
      </section>

      <PerDiseasePeakList
        rows={perDisease}
        diseases={diseases.rows}
        loading={seasonality.loading}
      />

      <Footer />
    </div>
  )
}
