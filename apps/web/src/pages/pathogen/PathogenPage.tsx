import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { usePathogen } from './data/usePathogen.js'
import { usePathogenCounties } from './data/usePathogenCounties.js'
import { usePathogenTicks } from './data/usePathogenTicks.js'
import { usePathogenDiseases } from './data/usePathogenDiseases.js'
import { HeroSection } from './sections/HeroSection.js'
import { RangeSection } from './sections/RangeSection.js'
import { TicksSection } from './sections/TicksSection.js'
import { DiseasesSection } from './sections/DiseasesSection.js'
import { RiskRailSection } from './sections/RiskRailSection.js'
import { buildPathogenHead } from './seo.js'

// /pathogens/[slug] — canonical pathogen encyclopedia page. Thin
// orchestrator on top of the pathogen-specific hooks; sections own
// their loading/empty/error copy. Shape mirrors DiseasePage.

export interface PathogenPageProps {
  slug: string
}

export function PathogenPage({ slug }: PathogenPageProps) {
  const { pathogen, status, error } = usePathogen(slug)
  const pathogenId = pathogen?.id ?? null

  const counties = usePathogenCounties(pathogenId)
  const ticks = usePathogenTicks(pathogenId)
  const diseases = usePathogenDiseases(pathogenId)

  const totalCounties = counties.data?.totalCounties ?? null
  const stateCount = counties.data?.stateCount ?? null
  const latestYear = counties.data?.latestYear ?? null
  const tickCount = ticks.loading ? null : ticks.rows.length
  const diseaseCount = diseases.loading ? null : diseases.rows.length

  const head = pathogen
    ? buildPathogenHead(pathogen, {
        counties: totalCounties,
        ticks: tickCount,
        diseases: diseaseCount,
      })
    : status === 'not-found'
      ? { title: 'Pathogen not found | Tickpedia', description: '', canonicalPath: `/pathogens/${slug}` }
      : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/pathogens/${slug}` }

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
  if (status === 'not-found' || !pathogen) {
    return <PageScaffold><NotFoundState slug={slug} /></PageScaffold>
  }

  return (
    <div className="tp-page" data-testid="pathogen-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Pathogens', href: '/pathogens' },
            { label: pathogen.displayName },
          ]}
        />
      </div>
      <HeroSection
        pathogen={pathogen}
        totalCounties={totalCounties}
        stateCount={stateCount}
        latestYear={latestYear}
        tickCount={tickCount}
        diseaseCount={diseaseCount}
      />
      <RangeSection
        pathogenSlug={pathogen.slug}
        pathogenName={pathogen.displayName}
        data={counties.data}
        loading={counties.loading}
        error={counties.error}
      />
      <TicksSection
        rows={ticks.rows}
        loading={ticks.loading}
        error={ticks.error}
        pathogenName={pathogen.displayName}
      />
      <DiseasesSection
        rows={diseases.rows}
        loading={diseases.loading}
        error={diseases.error}
        pathogenName={pathogen.displayName}
      />
      <RiskRailSection diseases={diseases.rows} loading={diseases.loading} />
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
      Loading pathogen…
    </p>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="ui" style={{ color: 'var(--accent)' }}>
      Failed to load pathogen: {message}
    </p>
  )
}

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div>
      <h1 className="tp-serif" style={{ fontSize: 28, marginBottom: 12 }}>
        Pathogen not found
      </h1>
      <p className="tp-serif" style={{ color: 'var(--ink-2)' }}>
        We don’t have a pathogen with the slug <code>{slug}</code>. Try the{' '}
        <a href="/pathogens">pathogens index</a>.
      </p>
    </div>
  )
}
