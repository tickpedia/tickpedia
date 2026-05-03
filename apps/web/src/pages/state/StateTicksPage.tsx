import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useStateRow } from './data/useStateRow.js'
import { useStateTicks } from './data/useStateTicks.js'
import { TicksSection } from './sections/TicksSection.js'
import { buildStateSubPageHead } from './seo.js'

// /states/[slug]/ticks — focused view of every tick species
// established in this state.

export interface StateTicksPageProps {
  slug: string
}

export function StateTicksPage({ slug }: StateTicksPageProps) {
  const { state, status } = useStateRow(slug)
  const ticks = useStateTicks(state?.fips ?? null)

  const head = state
    ? buildStateSubPageHead(state, 'Ticks')
    : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/states/${slug}/ticks` }

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
    <div className="tp-page" data-testid="state-ticks-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'States', href: '/states' },
            { label: state.name, href: pathFor('state', { slug: state.slug }) },
            { label: 'Ticks' },
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
          Ticks established in {state.name}
        </h1>
      </div>
      <TicksSection
        rows={ticks.rows}
        loading={ticks.loading}
        error={ticks.error}
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
            { label: 'Ticks' },
          ]}
        />
      </div>
      <div style={{ padding: '40px 32px' }}>{children}</div>
      <Footer />
    </div>
  )
}
