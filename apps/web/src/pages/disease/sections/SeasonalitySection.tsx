import { RadialSeasonality } from '../../../charts/index.js'
import { pathFor } from '../../../routes/index.js'
import type { DiseaseSeasonalityData } from '../data/useDiseaseSeasonality.js'
import { pickPeakMonth } from '../data/useDiseaseSeasonality.js'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

// "When is this disease's season?" Radial 12-month chart, plus a
// monthly breakdown table so the data is legible without parsing the
// dial. Used inline on /diseases/[slug] (compact) and full-width on
// /diseases/[slug]/seasonality.

export interface SeasonalitySectionProps {
  diseaseSlug: string
  diseaseName: string
  data: DiseaseSeasonalityData | null
  loading: boolean
  error: Error | null
  variant?: 'inline' | 'subpage'
  anchorId?: string
}

export function SeasonalitySection({
  diseaseSlug,
  diseaseName,
  data,
  loading,
  error,
  variant = 'inline',
  anchorId = 'seasonality',
}: SeasonalitySectionProps) {
  const peak = pickPeakMonth(data)
  const dialSize = variant === 'subpage' ? 280 : 200

  return (
    <section id={anchorId} className="tp-section" data-testid="disease-seasonality">
      <div className="head">
        <h2 className="tp-serif">Seasonality</h2>
        {variant === 'inline' ? (
          <a
            className="ui meta"
            href={pathFor('disease-seasonality', { slug: diseaseSlug })}
          >
            Open seasonality →
          </a>
        ) : (
          <span className="meta">diseaseMonth.seasonality</span>
        )}
      </div>

      {error && <ErrorMessage message={error.message} />}

      {!error && (!data || data.total === 0) && (
        <p className="tp-serif" style={{ fontSize: 14, color: 'var(--muted)' }}>
          {loading
            ? 'Loading…'
            : `Monthly breakdown not yet imported for ${diseaseName}.`}
        </p>
      )}

      {!error && data && data.total > 0 && (
        <div
          className="tp-range-grid"
          style={{ alignItems: 'center' }}
          data-testid="seasonality-grid"
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadialSeasonality
              months={data.months}
              size={dialSize}
              ariaLabel={`${diseaseName} monthly seasonality`}
            />
          </div>
          <div>
            <p
              className="tp-serif"
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                margin: '0 0 12px',
                color: 'var(--ink-2)',
              }}
            >
              {peak.monthName
                ? `Cases peak in ${peak.monthName} — about ${peak.count.toLocaleString()} ${peak.count === 1 ? 'case' : 'cases'} reported.`
                : `Reports are spread roughly evenly across the calendar year (no single month dominates).`}
            </p>
            <table className="tp-table" data-testid="seasonality-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="num">Cases</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((value, i) => (
                  <tr key={i}>
                    <td>{MONTH_NAMES[i]}</td>
                    <td className="num">{value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      className="ui"
      style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--mono)' }}
    >
      Failed to load seasonality: {message}
    </p>
  )
}
