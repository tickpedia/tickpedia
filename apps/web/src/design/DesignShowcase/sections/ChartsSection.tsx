import {
  Sparkline,
  LineChart,
  BarRow,
  RadialSeasonality,
  Choropleth,
  HexHeatmap,
  RampLegend,
  Leaderboard,
} from '../../../charts/index.js'

// Phase-2 review surface: every chart primitive at representative
// data + size, one per labelled card. Mockup data only — real data
// comes through SemiLayer in later phases.

const STATE_DATA = {
  ME: 9, NH: 9, VT: 9, MA: 9, CT: 9, RI: 9, NY: 9, PA: 9, NJ: 8, MD: 8, DE: 7,
  VA: 7, WV: 5, OH: 6, MI: 8, WI: 8, MN: 7, IA: 5, IL: 4, IN: 4, NC: 5, SC: 3,
  KY: 3, TN: 3, MO: 2, AR: 1, GA: 2, FL: 1, TX: 1,
}

const YEARLY_CASES = [12, 18, 28, 42, 58, 72, 89, 115, 142, 168, 201, 237, 289, 318, 352, 389, 425, 462, 498, 533, 571, 604, 628, 651, 672, 689]
const YEARS = Array.from({ length: YEARLY_CASES.length }, (_, i) => 1998 + i)

const MONTHLY = [3, 5, 12, 28, 62, 88, 110, 95, 64, 38, 18, 8]

const STATE_BARS = [
  { label: 'Pennsylvania', value: 11421 },
  { label: 'New York', value: 9842 },
  { label: 'New Jersey', value: 7104 },
  { label: 'Wisconsin', value: 6201 },
  { label: 'Massachusetts', value: 5984 },
]

const COUNTY_LEADERBOARD = [
  { rank: 1, label: 'Cumberland County, ME', value: 8421, sub: 'Maine' },
  { rank: 2, label: 'Hampshire County, MA', value: 7910, sub: 'Massachusetts' },
  { rank: 3, label: 'Litchfield County, CT', value: 6201, sub: 'Connecticut' },
  { rank: 4, label: 'Dutchess County, NY', value: 5872, sub: 'New York' },
  { rank: 5, label: 'Bucks County, PA', value: 5440, sub: 'Pennsylvania' },
]

export function ChartsSection() {
  return (
    <section style={{ marginTop: 56 }} data-testid="charts-section">
      <div className="ui eyebrow" style={{ marginBottom: 14 }}>
        Phase 02 — chart primitives
      </div>
      <p
        className="tp-serif"
        style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 620, marginBottom: 28 }}
      >
        Every chart on the public site reads its data from a SemiLayer
        analyse / feed and renders as inline SVG. No WebGL, no charting
        service. Each primitive sized + theme-token-driven so theme switches
        reflow charts immediately.
      </p>

      <Card title="Sparkline · inline trend" anno="ticks · sparklines per disease row">
        <div className="ui" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Sparkline data={[2, 5, 8, 14, 22, 35, 48, 62, 71, 78]} ariaLabel="Lyme cases trend" />
          <Sparkline data={[10, 8, 7, 9, 6, 5, 4, 3]} stroke="var(--ok)" ariaLabel="declining trend" />
          <Sparkline data={[5, 6, 5, 6, 5, 6]} fill={false} ariaLabel="flat trend" />
        </div>
      </Card>

      <Card title="Line chart · cases over time" anno="diseaseCountyYear.casesByYear">
        <LineChart data={YEARLY_CASES} years={YEARS} label="Reported cases · thousands" />
      </Card>

      <Card title="Bar row · cases by state" anno="diseaseCountyYear.casesByState">
        <BarRow rows={STATE_BARS} />
      </Card>

      <Card title="Radial seasonality · monthly" anno="diseaseMonth.seasonality">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <RadialSeasonality months={MONTHLY} ariaLabel="Lyme seasonality" />
          <p
            className="tp-serif"
            style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 320, lineHeight: 1.5 }}
          >
            June through August carry the bulk of reports — when nymphal ticks
            are questing and humans are outdoors.
          </p>
        </div>
      </Card>

      <Card title="Choropleth · state cartogram" anno="tickCounty.establishedByState">
        <Choropleth data={STATE_DATA} width={520} height={300} ariaLabel="established by state" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <RampLegend labels={['absent', 'established']} />
          <span className="ui" style={{ fontSize: 11, color: 'var(--muted)' }}>
            51 squares · 50 states + DC
          </span>
        </div>
      </Card>

      <Card title="Hex heatmap · continental risk" anno="diseaseCountyYear.densityByH3">
        <HexHeatmap synthesize ariaLabel="continental risk heatmap" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <RampLegend labels={['low', 'high']} />
          <span className="ui" style={{ fontSize: 11, color: 'var(--muted)' }}>
            H3 resolution 4 · ~1 770 km² hexagons · synthesised mockup
          </span>
        </div>
      </Card>

      <Card title="Leaderboard · top tick counties" anno="diseaseCountyYear.countyHotspots">
        <Leaderboard
          rows={COUNTY_LEADERBOARD.map((r, i) => ({
            ...r,
            trailing: (
              <Sparkline
                data={[10 + i, 14 + i, 22 + i, 31 + i, 42 + i, 55 + i, 70 - i, 82 - i]}
                width={100}
                height={20}
                ariaLabel={`${r.label} trend`}
              />
            ),
          }))}
          valueLabel="Cumulative cases"
        />
      </Card>
    </section>
  )
}

interface CardProps {
  title: string
  anno: string
  children: React.ReactNode
}

function Card({ title, anno, children }: CardProps) {
  return (
    <div
      className="hairline"
      style={{
        padding: 20,
        marginBottom: 18,
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3 className="tp-serif" style={{ fontSize: 18, fontWeight: 500 }}>
          {title}
        </h3>
        <code
          className="mono"
          style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.04em' }}
        >
          ⟶ {anno}
        </code>
      </div>
      {children}
    </div>
  )
}
