import { Choropleth } from '../../../charts/index.js'
import { RampLegend } from '../../../charts/index.js'
import { pathFor } from '../../../routes/index.js'
import type { TickRangeData } from '../data/useTickRange.js'

// "Where it's established" — square-cartogram choropleth keyed by
// state FIPS, with a link to the deeper /range sub-page.

export interface RangeSectionProps {
  tickSlug: string
  tickCommon: string
  data: TickRangeData | null
  loading: boolean
  error: Error | null
}

export function RangeSection({ tickSlug, tickCommon, data, loading, error }: RangeSectionProps) {
  return (
    <section className="tp-section">
      <div className="head">
        <h2 className="tp-serif">Where it’s established</h2>
        <a className="ui meta" href={pathFor('tick-range', { slug: tickSlug })}>
          Open full range →
        </a>
      </div>
      {error && <ErrorMessage message={error.message} />}
      {!error && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 1fr',
            gap: 32,
            alignItems: 'start',
          }}
        >
          <div>
            <Choropleth
              data={fipsToData(data)}
              width={520}
              height={300}
              ariaLabel={`${tickCommon} established range`}
              label="Counties established"
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
          <div>
            <p
              className="tp-serif"
              style={{ fontSize: 15, lineHeight: 1.5, margin: 0 }}
            >
              {summaryParagraph(tickCommon, data)}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function fipsToData(data: TickRangeData | null): Record<string, number> {
  if (!data) return {}
  // The Choropleth reads keys as USPS codes, so map FIPS → code
  // using the inline table we keep next door. Until the page-level
  // FIPS-to-USPS join lands, just re-key by FIPS — Choropleth will
  // show absent fills (which is the correct loading state).
  const out: Record<string, number> = {}
  for (const [fips, count] of data.byStateFips) {
    const code = USPS_BY_FIPS[fips]
    if (code) out[code] = count
  }
  return out
}

function summaryParagraph(tickCommon: string, data: TickRangeData | null): string {
  if (!data) return `Loading the established range for ${tickCommon}.`
  const states = data.byStateFips.size
  const total = [...data.byStateFips.values()].reduce((a, b) => a + b, 0)
  if (states === 0) {
    return `No CDC-reported established counties yet for ${tickCommon}. The range will populate as new surveillance reports land.`
  }
  return `Reported as established in ${total.toLocaleString()} ${total === 1 ? 'county' : 'counties'} across ${states} ${states === 1 ? 'state' : 'states'}. Each square is one US state, sized by how many counties have CDC-confirmed establishment.`
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
