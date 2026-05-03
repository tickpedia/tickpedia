import { useMemo } from 'react'
import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useCounty } from './data/useCounty.js'
import { useCountyDiseases } from './data/useCountyDiseases.js'
import { useCountyTicks } from './data/useCountyTicks.js'
import { useCountyNeighbours } from './data/useCountyNeighbours.js'
import { HeroSection } from './sections/HeroSection.js'
import { DiseaseBarsSection } from './sections/DiseaseBarsSection.js'
import { TicksSection } from './sections/TicksSection.js'
import { buildCountyHead } from './seo.js'
import { formatCountyName } from './data/county-name.js'

// /counties/[state-slug]/[county-slug] — canonical county page.
// Hero with FIPS + centroid eyebrow + neighbours sidebar; disease
// totals as a custom bar list; established ticks as a monogram-card
// rail mirroring the state page.

export interface CountyPageProps {
  stateSlug: string
  countySlug: string
}

export function CountyPage({ stateSlug, countySlug }: CountyPageProps) {
  const { county, parentState, status, error } = useCounty(stateSlug, countySlug)

  const focal = useMemo(
    () =>
      county
        ? {
            fips: county.fips,
            slug: county.slug,
            stateFips: county.stateFips,
            countyName: county.countyName,
            latitude: county.latitude,
            longitude: county.longitude,
          }
        : null,
    [county],
  )

  const diseases = useCountyDiseases(county?.fips ?? null)
  const ticks = useCountyTicks(county?.fips ?? null)
  const neighbours = useCountyNeighbours(focal)

  const head = county && parentState
    ? buildCountyHead(county, parentState)
    : status === 'not-found'
      ? { title: 'County not found | Tickpedia', description: '', canonicalPath: `/counties/${stateSlug}/${countySlug}` }
      : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/counties/${stateSlug}/${countySlug}` }

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
  if (status === 'not-found' || !county) {
    return (
      <PageScaffold>
        <NotFoundState
          stateSlug={parentState?.slug ?? null}
          stateName={parentState?.name ?? null}
        />
      </PageScaffold>
    )
  }

  if (!parentState) {
    // Defensive — useCounty resolves parentState before county. If we
    // got here without one, treat as not-found.
    return (
      <PageScaffold>
        <NotFoundState stateSlug={null} stateName={null} />
      </PageScaffold>
    )
  }

  const displayName = formatCountyName(county.countyName)
  const totalCases = diseases.loading
    ? null
    : diseases.rows.reduce((s, r) => s + r.total, 0)
  const tickCount = ticks.loading ? null : ticks.rows.length
  const topDisease = diseases.rows[0]
    ? {
        slug: diseases.rows[0].slug,
        displayName: diseases.rows[0].displayName,
        total: diseases.rows[0].total,
        latestYear: diseases.rows[0].latestYear,
      }
    : null

  return (
    <div className="tp-page" data-testid="county-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'States', href: '/states' },
            { label: parentState.name, href: pathFor('state', { slug: parentState.slug }) },
            { label: 'Counties', href: pathFor('state-counties', { slug: parentState.slug }) },
            { label: displayName },
          ]}
        />
      </div>
      <HeroSection
        county={county}
        parentState={parentState}
        totalCases={totalCases}
        tickCount={tickCount}
        topDisease={topDisease}
        neighbours={neighbours.rows}
        neighboursLoading={neighbours.loading}
      />
      <DiseaseBarsSection
        rows={diseases.rows}
        loading={diseases.loading}
        error={diseases.error}
        countyDisplayName={displayName}
      />
      <TicksSection
        rows={ticks.rows}
        loading={ticks.loading}
        error={ticks.error}
        countyDisplayName={displayName}
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
      Loading county…
    </p>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="ui" style={{ color: 'var(--accent)' }}>
      Failed to load county: {message}
    </p>
  )
}

function NotFoundState({
  stateSlug,
  stateName,
}: {
  stateSlug: string | null
  stateName: string | null
}) {
  return (
    <div>
      <h1 className="tp-serif" style={{ fontSize: 28, marginBottom: 12 }}>
        County not found
      </h1>
      <p className="tp-serif" style={{ color: 'var(--ink-2)' }}>
        {stateSlug && stateName ? (
          <>
            Try the{' '}
            <a href={pathFor('state-counties', { slug: stateSlug })}>
              counties of {stateName}
            </a>
            .
          </>
        ) : (
          <>
            Try the <a href="/states">states index</a>.
          </>
        )}
      </p>
    </div>
  )
}
