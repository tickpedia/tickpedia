import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useStateRow } from './data/useStateRow.js'
import { useStateDiseases } from './data/useStateDiseases.js'
import { DiseasesSection } from './sections/DiseasesSection.js'
import { buildStateSubPageHead } from './seo.js'

// /states/[slug]/diseases — focused view of every CDC-reported
// tick-borne disease in this state, sorted by total cases.

export interface StateDiseasesPageProps {
  slug: string
}

export function StateDiseasesPage({ slug }: StateDiseasesPageProps) {
  const { state, status } = useStateRow(slug)
  const diseases = useStateDiseases(state?.fips ?? null)

  const head = state
    ? buildStateSubPageHead(state, 'Diseases')
    : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/states/${slug}/diseases` }

  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    ...(head.description ? { description: head.description } : {}),
  })

  if (status === 'not-found' || !state) {
    if (status === 'loading') {
      return (
        <Scaffold slug={slug}>
          <p className="ui" style={{ color: 'var(--muted)' }}>Loading state…</p>
        </Scaffold>
      )
    }
    return (
      <Scaffold slug={slug}>
        <h1 className="tp-serif" style={{ fontSize: 28, marginBottom: 12 }}>
          State not found
        </h1>
        <p className="tp-serif" style={{ color: 'var(--ink-2)' }}>
          Try the <a href="/states">states index</a>.
        </p>
      </Scaffold>
    )
  }

  return (
    <div className="tp-page" data-testid="state-diseases-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'States', href: '/states' },
            { label: state.name, href: pathFor('state', { slug: state.slug }) },
            { label: 'Diseases' },
          ]}
        />
      </div>
      <div style={{ padding: '20px 32px 0' }}>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            margin: '4px 0 6px',
          }}
        >
          Disease cases reported in {state.name}
        </h1>
      </div>
      <DiseasesSection
        rows={diseases.rows}
        loading={diseases.loading}
        error={diseases.error}
        stateName={state.name}
      />
      <Footer />
    </div>
  )
}

function Scaffold({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'States', href: '/states' },
            { label: slug },
            { label: 'Diseases' },
          ]}
        />
      </div>
      <div style={{ padding: '40px 32px' }}>{children}</div>
      <Footer />
    </div>
  )
}
