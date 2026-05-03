import {
  Choropleth,
  Leaderboard,
  RampLegend,
  stateNameFor,
  stateSlugFor,
  type LeaderboardRow,
} from '../../../charts/index.js'
import { pathFor } from '../../../routes/index.js'
import type { PathogenCountiesData } from '../data/usePathogenCounties.js'

// "Where it's been detected" — choropleth + top-N leaderboard.
// Drives both the inline section on /pathogens/[slug] and the
// dedicated /pathogens/[slug]/range sub-page (variant='subpage').

export interface RangeSectionProps {
  pathogenSlug: string
  pathogenName: string
  data: PathogenCountiesData | null
  loading: boolean
  error: Error | null
  variant?: 'inline' | 'subpage'
  anchorId?: string
}

const TOP_N = 8

export function RangeSection({
  pathogenSlug,
  pathogenName,
  data,
  loading,
  error,
  variant = 'inline',
  anchorId = 'range',
}: RangeSectionProps) {
  const topRows = topStatesRows(data)
  const choroplethSize =
    variant === 'subpage'
      ? { width: 780, height: 460 }
      : { width: 520, height: 300 }

  return (
    <section id={anchorId} className="tp-section" data-testid="pathogen-range">
      <div className="head">
        <h2 className="tp-serif">Where it's been detected</h2>
        {variant === 'inline' ? (
          <a className="ui meta" href={pathFor('pathogen-range', { slug: pathogenSlug })}>
            Open full breakdown →
          </a>
        ) : (
          <span className="meta">pathogenCounty · status=present</span>
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
              ariaLabel={`${pathogenName} county presence by state`}
              label="Counties · per state"
              linkFor={(code) => {
                const slug = stateSlugFor(code)
                return slug ? `/states/${slug}` : null
              }}
              titleFor={(code, v) => {
                const name = stateNameFor(code)
                if (v <= 0) return `${name} — no detections on record`
                return `${name} — ${v.toLocaleString()} ${v === 1 ? 'county' : 'counties'}`
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <RampLegend labels={['none', 'most counties']} />
              {loading && <span className="ui meta">loading…</span>}
            </div>
          </div>
          <div data-testid="pathogen-range-summary">
            <p
              className="tp-serif"
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                margin: '0 0 12px',
                color: 'var(--ink-2)',
              }}
            >
              {summarySentence(pathogenName, data)}
            </p>
            {topRows.length > 0 ? (
              <Leaderboard
                rows={topRows}
                valueLabel="Counties"
                caption={`Top ${topRows.length} states`}
              />
            ) : (
              <p className="ui" style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                Pathogen presence not yet imported for {pathogenName}.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export function topStatesRows(data: PathogenCountiesData | null): LeaderboardRow[] {
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

function summarySentence(pathogenName: string, data: PathogenCountiesData | null): string {
  if (!data) return `Loading detection map for ${pathogenName}.`
  if (data.stateCount === 0) {
    return `Pathogen presence not yet imported for ${pathogenName}.`
  }
  return `Detected in ${data.totalCounties.toLocaleString()} ${data.totalCounties === 1 ? 'county' : 'counties'} across ${data.stateCount} ${data.stateCount === 1 ? 'state' : 'states'}.`
}

function fipsToData(data: PathogenCountiesData | null): Record<string, number> {
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
      Failed to load pathogen presence data: {message}
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
