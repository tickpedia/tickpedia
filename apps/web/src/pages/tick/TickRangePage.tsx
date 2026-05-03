import { PageHeader, Crumb, Stat, useDocumentHead } from '../shared/index.js'
import { Choropleth, RampLegend, LineChart } from '../../charts/index.js'
import { pathFor } from '../../routes/index.js'
import { useTick } from './data/useTick.js'
import { useTickRange } from './data/useTickRange.js'

// /ticks/[slug]/range — focused deep-dive on geographic spread.
// Bigger choropleth, year-over-year line chart, "X new counties"
// stat. Intentionally reuses the same data hooks as TickPage so the
// reads dedupe at the SemiLayer cache layer.

export interface TickRangePageProps {
  slug: string
}

export function TickRangePage({ slug }: TickRangePageProps) {
  const { tick, status, error } = useTick(slug)
  const tickId = tick?.id ?? null
  const range = useTickRange(tickId)

  const title = tick
    ? `${tick.commonName} range — Ticks | Tickpedia`
    : 'Tick range | Tickpedia'

  useDocumentHead({
    title,
    canonicalPath: pathFor('tick-range', { slug }),
  })

  if (status === 'loading') return <Shell>Loading…</Shell>
  if (status === 'error') return <Shell>Failed: {error?.message}</Shell>
  if (status === 'not-found' || !tick) {
    return (
      <Shell>
        <h1 className="tp-serif" style={{ fontSize: 28 }}>Tick not found</h1>
        <p className="tp-serif">No tick with slug <code>{slug}</code>. Try the <a href="/ticks">ticks index</a>.</p>
      </Shell>
    )
  }

  const totalEstablished = range.data
    ? [...range.data.byStateFips.values()].reduce((a, b) => a + b, 0)
    : null
  const stateCount = range.data?.byStateFips.size ?? null
  const latestYear = range.data?.spread.at(-1)
  const previousYear = range.data?.spread.at(-2)
  const yoyDelta =
    latestYear && previousYear ? latestYear.counties - previousYear.counties : null

  return (
    <div className="tp-page" data-testid="tick-range-page">
      <PageHeader active="ticks" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Ticks', href: '/ticks' },
            { label: tick.commonName, href: pathFor('tick', { slug }) },
            { label: 'Range' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 28px' }}>
        <div className="ui eyebrow">Geographic spread</div>
        <h1
          className="tp-serif"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '8px 0 6px' }}
        >
          Where {tick.commonName} is established
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          Per-state established-county counts from CDC tick presence reports, and the
          year-over-year footprint as the species' range has changed.
        </p>
      </div>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">Per-state footprint</h2>
          <span className="meta">tickCounty.establishedByState</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
          <div>
            <Choropleth
              data={fipsToData(range.data)}
              width={780}
              height={460}
              ariaLabel={`${tick.commonName} established range`}
              label="Counties established · per state"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <RampLegend labels={['absent', 'established']} />
              {range.loading && <span className="ui meta">loading…</span>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <Stat
              value={totalEstablished === null ? '…' : totalEstablished.toLocaleString()}
              label="Counties established"
            />
            <Stat
              value={stateCount === null ? '…' : String(stateCount)}
              label="States with at least one"
            />
            {yoyDelta !== null && latestYear && (
              <Stat
                value={(yoyDelta >= 0 ? '+' : '') + yoyDelta.toString()}
                label="Year-over-year"
                sub={`new counties · ${latestYear.year} vs ${previousYear?.year}`}
              />
            )}
          </div>
        </div>
      </section>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">Spread over time</h2>
          <span className="meta">tickCounty.spreadOverTime</span>
        </div>
        <SpreadView
          data={range.data}
          loading={range.loading}
          tickCommon={tick.commonName}
        />
      </section>
    </div>
  )
}

// Renders the right thing for the spread series:
//   2+ years  → line chart
//   1 year    → "X counties as of YYYY — historical YoY not yet imported."
//   0 years   → muted empty state
// CDC drops are yearly, so a single-year chart would be a flat dot
// that pretends to show a trend. Prefer prose until backfill lands.
function SpreadView({
  data,
  loading,
  tickCommon,
}: {
  data: ReturnType<typeof useTickRange>['data']
  loading: boolean
  tickCommon: string
}) {
  if (!data || data.spread.length === 0) {
    return (
      <p className="ui" style={{ color: 'var(--muted)' }}>
        {loading ? 'Loading…' : 'No year-over-year data yet.'}
      </p>
    )
  }
  if (data.spread.length === 1) {
    const only = data.spread[0]!
    return (
      <p className="tp-serif" style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 640 }}>
        {only.counties.toLocaleString()} counties established as of {only.year}. Historical
        year-over-year data has not been imported for {tickCommon} yet — once prior CDC
        surveillance years land, this section will show the year-over-year footprint.
      </p>
    )
  }
  return (
    <LineChart
      data={data.spread.map((s) => s.counties)}
      years={data.spread.map((s) => s.year)}
      width={760}
      height={240}
      label="Established counties · per year"
      ariaLabel={`${tickCommon} established counties per year`}
    />
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader active="ticks" />
      <div style={{ padding: '40px 32px' }}>{children}</div>
    </div>
  )
}

function fipsToData(data: ReturnType<typeof useTickRange>['data']): Record<string, number> {
  if (!data) return {}
  const out: Record<string, number> = {}
  for (const [fips, count] of data.byStateFips) {
    const code = USPS_BY_FIPS[fips]
    if (code) out[code] = count
  }
  return out
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
