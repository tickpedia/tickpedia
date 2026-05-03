import { PageHeader, Crumb, useDocumentHead } from '../shared/index.js'
import { useTick } from './data/useTick.js'
import { useTickRange } from './data/useTickRange.js'
import { useTickDiseases } from './data/useTickDiseases.js'
import { HeroSection } from './sections/HeroSection.js'
import { RangeSection } from './sections/RangeSection.js'
import { DiseasesSection } from './sections/DiseasesSection.js'
import { buildTickHead } from './seo.js'

// /ticks/[slug] — the canonical tick encyclopedia page. Composes the
// hero, the range section, and the diseases-it-carries table from
// three independent data hooks; the page itself stays a thin
// orchestrator.

export interface TickPageProps {
  slug: string
}

export function TickPage({ slug }: TickPageProps) {
  const { tick, status, error } = useTick(slug)
  const tickId = tick?.id ?? null

  const range = useTickRange(tickId)
  const diseases = useTickDiseases(tickId)

  const head = tick
    ? buildTickHead(tick)
    : status === 'not-found'
      ? { title: 'Tick not found | Tickpedia', description: '', canonicalPath: `/ticks/${slug}` }
      : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/ticks/${slug}` }

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
  if (status === 'not-found' || !tick) {
    return <PageScaffold><NotFoundState slug={slug} /></PageScaffold>
  }

  const establishedCounties = range.data
    ? Object.values(range.data.byStateFips).reduce((a, b) => a + b, 0)
    : null
  const diseaseCount = diseases.loading ? null : diseases.rows.length

  return (
    <div className="tp-page" data-testid="tick-page">
      <PageHeader active="ticks" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Ticks', href: '/ticks' },
            { label: tick.commonName },
          ]}
        />
      </div>
      <HeroSection
        tick={tick}
        establishedCounties={establishedCounties}
        diseaseCount={diseaseCount}
      />
      <RangeSection
        tickSlug={tick.slug}
        tickCommon={tick.commonName}
        data={range.data}
        loading={range.loading}
        error={range.error}
      />
      <DiseasesSection rows={diseases.rows} loading={diseases.loading} error={diseases.error} />
    </div>
  )
}

function PageScaffold({ children }: { children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader active="ticks" />
      <div style={{ padding: '40px 32px' }}>{children}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <p className="ui" style={{ color: 'var(--muted)' }}>
      Loading tick…
    </p>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="ui" style={{ color: 'var(--accent)' }}>
      Failed to load tick: {message}
    </p>
  )
}

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div>
      <h1 className="tp-serif" style={{ fontSize: 28, marginBottom: 12 }}>
        Tick not found
      </h1>
      <p className="tp-serif" style={{ color: 'var(--ink-2)' }}>
        We don’t have a tick with the slug <code>{slug}</code>. Try the{' '}
        <a href="/ticks">ticks index</a>.
      </p>
    </div>
  )
}
