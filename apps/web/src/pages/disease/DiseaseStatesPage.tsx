import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useDisease } from './data/useDisease.js'
import { useDiseaseStates } from './data/useDiseaseStates.js'
import { StatesSection } from './sections/StatesSection.js'
import { buildDiseaseSubPageHead } from './seo.js'

// /diseases/[slug]/states — focused state-by-state breakdown. Bigger
// choropleth + the same top-N leaderboard. Reads share the parent's
// data hooks so the SemiLayer cache layer dedupes when both are
// served in one session.

export interface DiseaseStatesPageProps {
  slug: string
}

export function DiseaseStatesPage({ slug }: DiseaseStatesPageProps) {
  const { disease, status, error } = useDisease(slug)
  const states = useDiseaseStates(disease?.id ?? null)

  const head = disease
    ? buildDiseaseSubPageHead(disease, 'States')
    : {
        title: 'Disease states | Tickpedia',
        description: '',
        canonicalPath: pathFor('disease-states', { slug }),
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
    <div className="tp-page" data-testid="disease-states-page">
      <PageHeader active="diseases" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Diseases', href: '/diseases' },
            { label: disease.displayName, href: pathFor('disease', { slug }) },
            { label: 'States' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 28px' }}>
        <div className="ui eyebrow">State-by-state cases</div>
        <h1
          className="tp-serif"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '8px 0 6px' }}
        >
          Where {disease.displayName} reports concentrate
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          CDC-reported case totals for {disease.displayName}, broken down by state.
          Click any state on the map to open its page.
        </p>
      </div>

      <StatesSection
        diseaseSlug={slug}
        diseaseName={disease.displayName}
        data={states.data}
        loading={states.loading}
        error={states.error}
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
