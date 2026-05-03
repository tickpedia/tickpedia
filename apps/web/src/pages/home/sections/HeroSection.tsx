import { HexHeatmap, type HexCell } from '../../../charts/HexHeatmap/index.js'
import { RampLegend } from '../../../charts/RampLegend/index.js'
import { UniversalSearch } from '../../../components/UniversalSearch.js'

// Home hero: 2-col at desktop (text + heatmap), 1-col under 880px
// (text above heatmap). The HexHeatmap canvas is intrinsically
// responsive via `viewBox`.

export interface HeroSectionProps {
  cells: ReadonlyArray<HexCell>
  loading: boolean
}

export function HeroSection({ cells, loading }: HeroSectionProps) {
  return (
    <div className="tp-home-hero" data-testid="home-hero">
      <div>
        <div className="ui eyebrow">A public-good encyclopedia · MIT · sources cited</div>
        <h1 className="tp-serif">
          Ticks, the diseases they carry, and the data behind every claim.
        </h1>
        <p className="tp-serif lede">
          <span className="tp-dropcap">S</span>
          eventeen species. Twenty-one reportable diseases. Three thousand
          counties of CDC surveillance. Tickpedia stitches them together so
          you can see <em>where</em> and <em>when</em> and <em>how much</em>
          {' '}— not just that ticks live in the woods.
        </p>
        <div style={{ marginTop: 22, maxWidth: 520 }}>
          <UniversalSearch />
        </div>
      </div>

      <div data-testid="home-heatmap-canvas">
        <div className="ui eyebrow" style={{ marginBottom: 8 }}>
          Tick-borne disease pressure · cumulative · CDC
        </div>
        <HexHeatmap
          width={620}
          height={300}
          cells={cells}
          compact
          synthesize={loading && cells.length === 0}
          ariaLabel="Continental tick-borne disease heatmap"
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <RampLegend labels={['fewer cases', 'more']} />
          <a
            className="ui"
            href="/risk"
            style={{
              fontSize: 12,
              color: 'var(--accent)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            See the full map →
          </a>
        </div>
      </div>
    </div>
  )
}
