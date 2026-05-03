import { useMemo } from 'react'
import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { useTechnique } from './data/useTechnique.js'
import { useTechniqueTicks } from './data/useTechniqueTicks.js'
import { useTechniqueDiseases } from './data/useTechniqueDiseases.js'
import { useEntityFacts } from '../fact/data/useEntityFacts.js'
import { HeroSection } from './sections/HeroSection.js'
import { StepsSection } from './sections/StepsSection.js'
import { PreventsDiseasesSection } from './sections/PreventsDiseasesSection.js'
import { FactsRail } from '../fact/sections/FactsRail.js'
import { buildTechniqueHead } from './seo.js'

// /techniques/[slug] — the canonical technique encyclopedia page.
// Thin orchestrator like the tick / disease pages: a hero with the
// title + applies-to chips, the HowTo steps, and a derived rail of
// diseases the technique can help prevent.

export interface TechniquePageProps {
  slug: string
}

export function TechniquePage({ slug }: TechniquePageProps) {
  const { technique, status, error } = useTechnique(slug)
  const techniqueId = technique?.id ?? null

  const ticks = useTechniqueTicks(techniqueId)
  const tickIds = useMemo(() => ticks.rows.map((r) => r.id), [ticks.rows])
  const diseases = useTechniqueDiseases(techniqueId, tickIds)
  const facts = useEntityFacts('technique', techniqueId)

  const head = technique
    ? buildTechniqueHead(technique)
    : status === 'not-found'
      ? { title: 'Technique not found | Tickpedia', description: '', canonicalPath: `/techniques/${slug}` }
      : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/techniques/${slug}` }

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
  if (status === 'not-found' || !technique) {
    return <PageScaffold><NotFoundState slug={slug} /></PageScaffold>
  }

  return (
    <div className="tp-page" data-testid="technique-page">
      <PageHeader active="techniques" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Techniques', href: '/techniques' },
            { label: technique.title },
          ]}
        />
      </div>
      <HeroSection
        technique={technique}
        tickRows={ticks.rows}
        ticksLoading={ticks.loading}
      />
      <StepsSection steps={technique.steps} techniqueTitle={technique.title} />
      <PreventsDiseasesSection
        rows={diseases.rows}
        loading={diseases.loading}
        error={diseases.error}
      />
      <FactsRail
        rows={facts.rows}
        loading={facts.loading}
        error={facts.error}
        testIdPrefix="technique-facts"
      />
      <Footer />
    </div>
  )
}

function PageScaffold({ children }: { children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader active="techniques" />
      <div style={{ padding: '40px 32px' }}>{children}</div>
      <Footer />
    </div>
  )
}

function LoadingState() {
  return (
    <p className="ui" style={{ color: 'var(--muted)' }}>
      Loading technique…
    </p>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="ui" style={{ color: 'var(--accent)' }}>
      Failed to load technique: {message}
    </p>
  )
}

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div>
      <h1 className="tp-serif" style={{ fontSize: 28, marginBottom: 12 }}>
        Technique not found
      </h1>
      <p className="tp-serif" style={{ color: 'var(--ink-2)' }}>
        We don’t have a technique with the slug <code>{slug}</code>. Try the{' '}
        <a href="/techniques">techniques index</a>.
      </p>
    </div>
  )
}
