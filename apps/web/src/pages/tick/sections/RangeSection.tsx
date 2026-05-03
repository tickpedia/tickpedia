import { Choropleth, Leaderboard, stateNameFor, stateSlugFor } from '../../../charts/index.js'
import { RampLegend, type LeaderboardRow } from '../../../charts/index.js'
import { pathFor } from '../../../routes/index.js'
import type { TickRangeData } from '../data/useTickRange.js'

// "Where it's established" — square-cartogram choropleth keyed by
// state FIPS, plus a top-N states leaderboard so the right column
// carries its own weight (the choropleth is great for shape, the
// leaderboard for ranking + raw counts).

export interface RangeSectionProps {
  tickSlug: string
  tickCommon: string
  data: TickRangeData | null
  loading: boolean
  error: Error | null
}

const TOP_N = 8

export function RangeSection({ tickSlug, tickCommon, data, loading, error }: RangeSectionProps) {
  const topRows = topStatesRows(data)
  const summary = summarySentence(tickCommon, data)

  return (
    <section id="range" className="tp-section">
      <div className="head">
        <h2 className="tp-serif">Where it’s established</h2>
        <a className="ui meta" href={pathFor('tick-range', { slug: tickSlug })}>
          Open full range →
        </a>
      </div>
      {error && <ErrorMessage message={error.message} />}
      {!error && (
        <div className="tp-range-grid" data-testid="range-grid">
          <div>
            <Choropleth
              data={fipsToData(data)}
              width={520}
              height={300}
              ariaLabel={`${tickCommon} established range`}
              label="Counties established"
              linkFor={(code) => {
                const slug = stateSlugFor(code)
                return slug ? `/states/${slug}` : null
              }}
              titleFor={(code, v) => {
                const name = stateNameFor(code)
                if (v <= 0) return `${name} — no established counties`
                return `${name} — ${v.toLocaleString()} ${v === 1 ? 'county' : 'counties'} established`
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
              }}
            >
              <RampLegend labels={['absent', 'established']} />
              {loading && <span className="ui meta">loading…</span>}
            </div>
          </div>
          <div data-testid="range-summary">
            <p
              className="tp-serif"
              style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 12px', color: 'var(--ink-2)' }}
            >
              {summary}
            </p>
            {topRows.length > 0 ? (
              <Leaderboard
                rows={topRows}
                valueLabel="Counties"
                caption={`Top ${topRows.length} states`}
              />
            ) : (
              <p
                className="ui"
                style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}
              >
                No CDC-reported establishments yet — the leaderboard
                fills in as new surveillance reports land.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function fipsToData(data: TickRangeData | null): Record<string, number> {
  if (!data) return {}
  // The Choropleth reads keys as USPS codes, so map FIPS → code
  // using the inline table we keep next door.
  const out: Record<string, number> = {}
  for (const [fips, count] of Object.entries(data.byStateFips)) {
    const code = USPS_BY_FIPS[fips]
    if (code) out[code] = count
  }
  return out
}

/**
 * Top-N states by established-county count. Drops zero-count rows
 * and rows whose FIPS doesn't resolve to a USPS code (territories /
 * dirty data) so the leaderboard never shows blank rank entries.
 */
export function topStatesRows(data: TickRangeData | null): LeaderboardRow[] {
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

function summarySentence(tickCommon: string, data: TickRangeData | null): string {
  if (!data) return `Loading the established range for ${tickCommon}.`
  const states = Object.keys(data.byStateFips).filter((f) => (data.byStateFips[f] ?? 0) > 0).length
  const total = Object.values(data.byStateFips).reduce((a, b) => a + b, 0)
  if (states === 0) {
    return `No CDC-reported established counties yet for ${tickCommon}.`
  }
  return `Established in ${total.toLocaleString()} ${total === 1 ? 'county' : 'counties'} across ${states} ${states === 1 ? 'state' : 'states'}.`
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      className="ui"
      style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--mono)' }}
    >
      Failed to load range data: {message}
    </p>
  )
}

// Inline FIPS → USPS code lookup. Co-located with the section that
// needs it; if a second consumer appears, lift to a shared module.
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
