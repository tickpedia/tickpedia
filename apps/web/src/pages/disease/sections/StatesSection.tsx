import {
  Choropleth,
  Leaderboard,
  RampLegend,
  stateNameFor,
  stateSlugFor,
  type LeaderboardRow,
} from '../../../charts/index.js'
import { pathFor } from '../../../routes/index.js'
import type { DiseaseStatesData } from '../data/useDiseaseStates.js'

// "State-by-state cases" — choropleth + top-N leaderboard. Drives the
// /diseases/[slug] inline section (compact size) and the
// /diseases/[slug]/states sub-page (larger, full-width).

export interface StatesSectionProps {
  diseaseSlug: string
  diseaseName: string
  data: DiseaseStatesData | null
  loading: boolean
  error: Error | null
  /** Bigger choropleth on the dedicated /states sub-page. */
  variant?: 'inline' | 'subpage'
  /** Linkable section anchor for in-page jumps. */
  anchorId?: string
}

const TOP_N = 8

export function StatesSection({
  diseaseSlug,
  diseaseName,
  data,
  loading,
  error,
  variant = 'inline',
  anchorId = 'states',
}: StatesSectionProps) {
  const topRows = topStatesRows(data)
  const choroplethSize =
    variant === 'subpage'
      ? { width: 780, height: 460 }
      : { width: 520, height: 300 }

  return (
    <section id={anchorId} className="tp-section" data-testid="disease-states">
      <div className="head">
        <h2 className="tp-serif">State-by-state cases</h2>
        {variant === 'inline' ? (
          <a
            className="ui meta"
            href={pathFor('disease-states', { slug: diseaseSlug })}
          >
            Open full breakdown →
          </a>
        ) : (
          <span className="meta">diseaseCountyYear.casesByState</span>
        )}
      </div>
      {error && <ErrorMessage message={error.message} />}
      {!error && (
        <div className="tp-range-grid">
          <div>
            <Choropleth
              data={fipsToData(data)}
              width={choroplethSize.width}
              height={choroplethSize.height}
              ariaLabel={`${diseaseName} cases by state`}
              label="Cases · per state"
              linkFor={(code) => {
                const slug = stateSlugFor(code)
                return slug ? `/states/${slug}` : null
              }}
              titleFor={(code, v) => {
                const name = stateNameFor(code)
                if (v <= 0) return `${name} — no CDC-reported cases`
                return `${name} — ${v.toLocaleString()} ${v === 1 ? 'case' : 'cases'}`
              }}
            />
            <div
              style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}
            >
              <RampLegend labels={['none', 'most cases']} />
              {loading && <span className="ui meta">loading…</span>}
            </div>
          </div>
          <div data-testid="disease-states-summary">
            <p
              className="tp-serif"
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                margin: '0 0 12px',
                color: 'var(--ink-2)',
              }}
            >
              {summarySentence(diseaseName, data)}
            </p>
            {topRows.length > 0 ? (
              <Leaderboard
                rows={topRows}
                valueLabel="Cases"
                caption={`Top ${topRows.length} states`}
              />
            ) : (
              <p
                className="ui"
                style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}
              >
                No CDC-reported cases yet for {diseaseName}.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export function topStatesRows(data: DiseaseStatesData | null): LeaderboardRow[] {
  if (!data) return []
  const rows: Array<{ code: string; count: number }> = []
  for (const [fips, count] of Object.entries(data.byStateFips)) {
    if (count <= 0) continue
    const code = USPS_BY_FIPS[fips]
    if (!code) continue
    rows.push({ code, count })
  }
  rows.sort((a, b) => b.count - a.count)
  return rows.slice(0, TOP_N).map((r, i) => ({
    rank: i + 1,
    label: stateNameFor(r.code),
    href: stateSlugFor(r.code) ? `/states/${stateSlugFor(r.code)!}` : undefined,
    value: r.count,
  })) as LeaderboardRow[]
}

function summarySentence(diseaseName: string, data: DiseaseStatesData | null): string {
  if (!data) return `Loading state breakdown for ${diseaseName}.`
  if (data.stateCount === 0) {
    return `No CDC-reported cases yet for ${diseaseName}.`
  }
  return `${data.total.toLocaleString()} reported ${data.total === 1 ? 'case' : 'cases'} across ${data.stateCount} ${data.stateCount === 1 ? 'state' : 'states'}.`
}

function fipsToData(data: DiseaseStatesData | null): Record<string, number> {
  if (!data) return {}
  const out: Record<string, number> = {}
  for (const [fips, count] of Object.entries(data.byStateFips)) {
    const code = USPS_BY_FIPS[fips]
    if (code) out[code] = count
  }
  return out
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      className="ui"
      style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--mono)' }}
    >
      Failed to load state data: {message}
    </p>
  )
}

const USPS_BY_FIPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY',
}
