import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { useStateRow } from './data/useStateRow.js'
import { useStateTicks } from './data/useStateTicks.js'
import { useStateDiseases } from './data/useStateDiseases.js'
import { useStateCounties } from './data/useStateCounties.js'
import { useStateCountyHotspots } from './data/useStateCountyHotspots.js'
import { HeroSection } from './sections/HeroSection.js'
import { TicksSection } from './sections/TicksSection.js'
import { DiseasesSection } from './sections/DiseasesSection.js'
import { CountyHotspotsSection } from './sections/CountyHotspotsSection.js'
import { buildStateHead } from './seo.js'

// /states/[slug] — canonical state page. Thin orchestrator like the
// disease page: hero with FIPS / USPS / county chips, the ticks rail,
// the disease leaderboard, and the worst-counties leaderboard.

export interface StatePageProps {
  slug: string
}

export function StatePage({ slug }: StatePageProps) {
  const { state, status, error } = useStateRow(slug)
  const stateFips = state?.fips ?? null

  const ticks = useStateTicks(stateFips)
  const diseases = useStateDiseases(stateFips)
  const counties = useStateCounties(stateFips)
  const hotspots = useStateCountyHotspots(stateFips)

  const head = state
    ? buildStateHead(state)
    : status === 'not-found'
      ? { title: 'State not found | Tickpedia', description: '', canonicalPath: `/states/${slug}` }
      : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/states/${slug}` }

  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    ...(head.description ? { description: head.description } : {}),
  })

  if (status === 'loading') {
    return <PageScaffold><LoadingState /></PageScaffold>
  }
  if (status === 'error') {
    return <PageScaffold><ErrorState message={error?.message ?? 'Unknown error'} /></PageScaffold>
  }
  if (status === 'not-found' || !state) {
    return <PageScaffold><NotFoundState slug={slug} /></PageScaffold>
  }

  const tickCount = ticks.loading ? null : ticks.rows.length
  const countyCount = counties.loading ? null : counties.rows.length
  const topDisease = diseases.rows[0]
    ? {
        slug: diseases.rows[0].slug,
        displayName: diseases.rows[0].displayName,
        total: diseases.rows[0].total,
      }
    : null

  return (
    <div className="tp-page" data-testid="state-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'States', href: '/states' },
            { label: state.name },
          ]}
        />
      </div>
      <HeroSection
        state={state}
        countyCount={countyCount}
        tickCount={tickCount}
        topDisease={topDisease}
      />
      <TicksSection
        rows={ticks.rows}
        loading={ticks.loading}
        error={ticks.error}
        stateName={state.name}
      />
      <DiseasesSection
        rows={diseases.rows}
        loading={diseases.loading}
        error={diseases.error}
        stateName={state.name}
      />
      <CountyHotspotsSection
        state={state}
        rows={hotspots.rows}
        loading={hotspots.loading}
        error={hotspots.error}
      />
      <Footer />
    </div>
  )
}

function PageScaffold({ children }: { children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader />
      <div style={{ padding: '40px 32px' }}>{children}</div>
      <Footer />
    </div>
  )
}

function LoadingState() {
  return (
    <p className="ui" style={{ color: 'var(--muted)' }}>
      Loading state…
    </p>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="ui" style={{ color: 'var(--accent)' }}>
      Failed to load state: {message}
    </p>
  )
}

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div>
      <h1 className="tp-serif" style={{ fontSize: 28, marginBottom: 12 }}>
        State not found
      </h1>
      <p className="tp-serif" style={{ color: 'var(--ink-2)' }}>
        We don’t have a state with the slug <code>{slug}</code>. Try the{' '}
        <a href="/states">states index</a>.
      </p>
    </div>
  )
}
