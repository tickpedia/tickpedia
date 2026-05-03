import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useDisease } from './data/useDisease.js'
import { useDiseaseSeasonality } from './data/useDiseaseSeasonality.js'
import { SeasonalitySection } from './sections/SeasonalitySection.js'
import { buildDiseaseSubPageHead } from './seo.js'

export interface DiseaseSeasonalityPageProps {
  slug: string
}

export function DiseaseSeasonalityPage({ slug }: DiseaseSeasonalityPageProps) {
  const { disease, status, error } = useDisease(slug)
  const seasonality = useDiseaseSeasonality(disease?.id ?? null)

  const head = disease
    ? buildDiseaseSubPageHead(disease, 'Seasonality')
    : {
        title: 'Disease seasonality | Tickpedia',
        description: '',
        canonicalPath: pathFor('disease-seasonality', { slug }),
      }

  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    ...(head.description ? { description: head.description } : {}),
  })

  if (status === 'loading') return <Shell>Loading…</Shell>
  if (status === 'error') return <Shell>Failed: {error?.message}</Shell>
  if (status === 'not-found' || !disease) {
    return (
      <Shell>
        <h1 className="tp-serif" style={{ fontSize: 28 }}>
          Disease not found
        </h1>
        <p className="tp-serif">
          No disease with slug <code>{slug}</code>. Try the{' '}
          <a href="/diseases">diseases index</a>.
        </p>
      </Shell>
    )
  }

  return (
    <div className="tp-page" data-testid="disease-seasonality-page">
      <PageHeader active="diseases" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Diseases', href: '/diseases' },
            { label: disease.displayName, href: pathFor('disease', { slug }) },
            { label: 'Seasonality' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 28px' }}>
        <div className="ui eyebrow">Seasonality</div>
        <h1
          className="tp-serif"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '8px 0 6px' }}
        >
          When {disease.displayName} reports peak
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          Monthly CDC report counts for {disease.displayName} aggregated across all
          available years.
        </p>
      </div>

      <SeasonalitySection
        diseaseSlug={slug}
        diseaseName={disease.displayName}
        data={seasonality.data}
        loading={seasonality.loading}
        error={seasonality.error}
        variant="subpage"
      />

      <Footer />
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader active="diseases" />
      <div style={{ padding: '40px 32px' }}>{children}</div>
      <Footer />
    </div>
  )
}
