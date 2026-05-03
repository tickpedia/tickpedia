import { HexHeatmap, type HexCell } from '../../../charts/HexHeatmap/index.js'
import { RampLegend } from '../../../charts/RampLegend/index.js'

// Full-width heatmap section for /risk and /risk/[slug]. Shares one
// component since the only difference between unfiltered + filtered
// is the cells passed in.

export interface HeatmapSectionProps {
  cells: ReadonlyArray<HexCell>
  loading: boolean
  caption: string
  ariaLabel: string
}

export function HeatmapSection({
  cells,
  loading,
  caption,
  ariaLabel,
}: HeatmapSectionProps) {
  if (!loading && cells.length === 0) {
    return (
      <section className="tp-section" data-testid="risk-heatmap">
        <div className="head">
          <h2 className="tp-serif">Heatmap</h2>
        </div>
        <p className="ui" style={{ color: 'var(--ink-2)', fontSize: 14 }}>
          Density data not yet imported — check back as CDC drops post.
        </p>
      </section>
    )
  }

  return (
    <section className="tp-section" data-testid="risk-heatmap">
      <div className="head">
        <h2 className="tp-serif">Heatmap</h2>
        <span className="meta">
          {loading ? 'loading…' : `${cells.length} cells · CDC density · H3 res-4`}
        </span>
      </div>
      <HexHeatmap
        width={960}
        height={460}
        cells={cells}
        synthesize={loading && cells.length === 0}
        ariaLabel={ariaLabel}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 12,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <RampLegend labels={['fewer cases', 'more']} />
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--muted)' }}
        >
          {caption}
        </span>
      </div>
    </section>
  )
}
