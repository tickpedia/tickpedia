import { useMemo } from 'react'
import { PageHeader, Footer, useDocumentHead } from '../shared/index.js'
import { bucketsToCells } from '../../charts/HexHeatmap/h3-project.js'
import { useRiskHeatmap } from './data/useRiskHeatmap.js'
import { useRiskHotspots } from './data/useRiskHotspots.js'
import { useRiskDiseases } from './data/useRiskDiseases.js'
import { HeatmapSection } from './sections/HeatmapSection.js'
import { DiseaseChipsSection } from './sections/DiseaseChipsSection.js'
import { HotspotsSection } from './sections/HotspotsSection.js'
import { buildRiskHead } from './seo.js'

// /risk — continental risk map. Full-width H3 heatmap, then the
// disease filter chip rail, then a top-12 hotspot leaderboard.

const HEATMAP_SIZE = { width: 960, height: 460 } as const

export function RiskPage() {
  const head = buildRiskHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const heatmap = useRiskHeatmap(null)
  const hotspots = useRiskHotspots()
  const diseases = useRiskDiseases()

  const cells = useMemo(
    () => bucketsToCells(heatmap.buckets, HEATMAP_SIZE),
    [heatmap.buckets],
  )

  return (
    <div className="tp-page" data-testid="risk-page">
      <PageHeader active="risk" />

      <div style={{ padding: '44px 32px 12px' }}>
        <div className="ui eyebrow">
          Continental H3 heatmap · CDC · cumulative
        </div>
        <h1 className="tp-serif" style={{ fontSize: 44, lineHeight: 1.05, margin: '8px 0 12px' }}>
          Where tick-borne disease lives.
        </h1>
        <p className="tp-serif lede" style={{ maxWidth: 720 }}>
          Hexagonal density across the lower-48 — every reported case bucketed
          into a ~1,770 km² cell. Filter by disease to see the geography of
          one pathogen at a time.
        </p>
      </div>

      <HeatmapSection
        cells={cells}
        loading={heatmap.loading}
        caption="H3 res-4 · equirectangular CONUS bbox"
        ariaLabel="Continental tick-borne disease heatmap"
      />

      <DiseaseChipsSection rows={diseases.rows} loading={diseases.loading} />

      <HotspotsSection rows={hotspots.rows} loading={hotspots.loading} />

      <Footer />
    </div>
  )
}
