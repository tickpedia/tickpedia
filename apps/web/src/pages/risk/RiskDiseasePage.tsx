import { useMemo } from 'react'
import { PageHeader, Footer, useDocumentHead } from '../shared/index.js'
import { bucketsToCells } from '../../charts/HexHeatmap/h3-project.js'
import { pathFor } from '../../routes/index.js'
import { useRiskHeatmap } from './data/useRiskHeatmap.js'
import { useRiskDisease } from './data/useRiskDisease.js'
import { useRiskDiseases } from './data/useRiskDiseases.js'
import { HeatmapSection } from './sections/HeatmapSection.js'
import { DiseaseChipsSection } from './sections/DiseaseChipsSection.js'
import { buildRiskDiseaseHead, buildRiskHead } from './seo.js'

// /risk/[disease-slug] — same surface as /risk, but the heatmap
// passes `where: { diseaseId }` to the lens. Canonicalizes back to
// /risk per the URL contract; the page still self-titles for SERP
// relevance. A "← All diseases" chip + per-row aria-current on the
// chip rail signal which filter is active.

const HEATMAP_SIZE = { width: 960, height: 460 } as const

export interface RiskDiseasePageProps {
  slug: string
}

export function RiskDiseasePage({ slug }: RiskDiseasePageProps) {
  const diseaseRes = useRiskDisease(slug)
  const diseaseId = diseaseRes.disease?.id ?? null

  const head = useMemo(() => {
    if (diseaseRes.status === 'ok' && diseaseRes.disease) {
      return buildRiskDiseaseHead({
        slug: diseaseRes.disease.slug,
        displayName: diseaseRes.disease.displayName,
        oneLiner: diseaseRes.disease.oneLiner,
      })
    }
    return buildRiskHead()
  }, [diseaseRes.status, diseaseRes.disease])

  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const heatmap = useRiskHeatmap(diseaseId, slug)
  const diseases = useRiskDiseases()

  const cells = useMemo(
    () => bucketsToCells(heatmap.buckets, HEATMAP_SIZE),
    [heatmap.buckets],
  )

  if (diseaseRes.status === 'not-found') {
    return (
      <div className="tp-page" data-testid="risk-disease-page">
        <PageHeader active="risk" />
        <div style={{ padding: '64px 32px' }}>
          <div className="ui eyebrow">404</div>
          <h1 className="tp-serif">No such disease.</h1>
          <p className="tp-serif lede" style={{ maxWidth: 520 }}>
            <code className="mono">{slug}</code> isn't in our reportable
            disease catalog.{' '}
            <a href="/risk">Browse the risk map</a>.
          </p>
        </div>
        <Footer />
      </div>
    )
  }

  const disease = diseaseRes.disease
  const displayName = disease?.displayName ?? '…'

  return (
    <div className="tp-page" data-testid="risk-disease-page">
      <PageHeader active="risk" />

      <div style={{ padding: '44px 32px 12px' }}>
        <div className="ui eyebrow">
          Continental H3 heatmap · CDC · cumulative
        </div>
        <h1
          className="tp-serif"
          style={{ fontSize: 44, lineHeight: 1.05, margin: '8px 0 12px' }}
        >
          Where {displayName.toLowerCase()} lives.
        </h1>
        {disease?.oneLiner && (
          <p className="tp-serif lede" style={{ maxWidth: 720 }}>
            {disease.oneLiner}
          </p>
        )}
        <div
          className="ui"
          style={{ marginTop: 16, fontSize: 12, display: 'flex', gap: 14, flexWrap: 'wrap' }}
        >
          <a href="/risk" data-testid="risk-back-all">
            ← All diseases
          </a>
          {disease && (
            <a href={pathFor('disease', { slug: disease.slug })}>
              About {displayName} →
            </a>
          )}
        </div>
      </div>

      <HeatmapSection
        cells={cells}
        loading={heatmap.loading || diseaseRes.status === 'loading'}
        caption={`H3 res-4 · filtered: ${displayName}`}
        ariaLabel={`${displayName} risk heatmap`}
      />

      <DiseaseChipsSection
        rows={diseases.rows}
        loading={diseases.loading}
        activeSlug={slug}
      />

      <Footer />
    </div>
  )
}
