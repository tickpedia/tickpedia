import { LineChart } from '../../../charts/index.js'
import { pathFor } from '../../../routes/index.js'
import type { DiseaseHistoryData } from '../data/useDiseaseHistory.js'

// "Year-over-year" — line chart of total cases per year. Compact on
// /diseases/[slug]; full-width on /diseases/[slug]/history.

export interface HistorySectionProps {
  diseaseSlug: string
  diseaseName: string
  data: DiseaseHistoryData | null
  loading: boolean
  error: Error | null
  variant?: 'inline' | 'subpage'
  anchorId?: string
}

export function HistorySection({
  diseaseSlug,
  diseaseName,
  data,
  loading,
  error,
  variant = 'inline',
  anchorId = 'history',
}: HistorySectionProps) {
  return (
    <section id={anchorId} className="tp-section" data-testid="disease-history">
      <div className="head">
        <h2 className="tp-serif">Year-over-year</h2>
        {variant === 'inline' ? (
          <a
            className="ui meta"
            href={pathFor('disease-history', { slug: diseaseSlug })}
          >
            Open full history →
          </a>
        ) : (
          <span className="meta">diseaseCountyYear.casesByYear</span>
        )}
      </div>

      {error && <ErrorMessage message={error.message} />}

      {!error && (!data || data.rows.length === 0) && (
        <p className="tp-serif" style={{ fontSize: 14, color: 'var(--muted)' }}>
          {loading
            ? 'Loading…'
            : `Year-over-year totals not yet imported for ${diseaseName}.`}
        </p>
      )}

      {!error && data && data.rows.length === 1 && (
        <SinglePoint diseaseName={diseaseName} only={data.rows[0]!} />
      )}

      {!error && data && data.rows.length >= 2 && (
        <LineChart
          data={data.rows.map((r) => r.count)}
          years={data.rows.map((r) => r.year)}
          width={variant === 'subpage' ? 760 : 640}
          height={variant === 'subpage' ? 280 : 220}
          label="Reported cases · per year"
          ariaLabel={`${diseaseName} cases per year`}
        />
      )}
    </section>
  )
}

function SinglePoint({
  diseaseName,
  only,
}: {
  diseaseName: string
  only: { year: number; count: number }
}) {
  return (
    <p
      className="tp-serif"
      style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 640 }}
    >
      {only.count.toLocaleString()} reported {only.count === 1 ? 'case' : 'cases'} for {diseaseName} as of {only.year}. Historical year-over-year data has not been imported yet — once prior CDC drops land, this section will show the trend.
    </p>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      className="ui"
      style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--mono)' }}
    >
      Failed to load history: {message}
    </p>
  )
}
