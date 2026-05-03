import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { useFact } from './data/useFact.js'
import { useFactRefs } from './data/useFactRefs.js'
import { useFactRelated } from './data/useFactRelated.js'
import { titleizeSlug } from './data/slug-title.js'
import { HeroSection } from './sections/HeroSection.js'
import { RelatedSection } from './sections/RelatedSection.js'
import { buildFactHead } from './seo.js'

// /facts/[slug] — single wild fact, citable, shareable. Thin
// orchestrator: fact body + refs sidebar in the hero, related-facts
// rail below. No charts, no sub-sections beyond related.

export interface FactPageProps {
  slug: string
}

export function FactPage({ slug }: FactPageProps) {
  const { fact, status, error } = useFact(slug)
  const factId = fact?.id ?? null

  const refs = useFactRefs(factId)
  const related = useFactRelated(factId)

  const head = fact
    ? buildFactHead(fact, {
        ticks: refs.ticks,
        diseases: refs.diseases,
        techniques: refs.techniques,
      })
    : status === 'not-found'
      ? { title: 'Fact not found | Tickpedia', description: '', canonicalPath: `/facts/${slug}` }
      : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/facts/${slug}` }

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
  if (status === 'not-found' || !fact) {
    return <PageScaffold><NotFoundState slug={slug} /></PageScaffold>
  }

  return (
    <div className="tp-page" data-testid="fact-page">
      <PageHeader active="facts" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Wild facts', href: '/facts' },
            { label: titleizeSlug(fact.slug) },
          ]}
        />
      </div>
      <HeroSection
        fact={fact}
        refs={{ ticks: refs.ticks, diseases: refs.diseases, techniques: refs.techniques }}
        refsLoading={refs.loading}
      />
      <RelatedSection rows={related.rows} loading={related.loading} />
      <Footer />
    </div>
  )
}

function PageScaffold({ children }: { children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader active="facts" />
      <div style={{ padding: '40px 32px' }}>{children}</div>
      <Footer />
    </div>
  )
}

function LoadingState() {
  return (
    <p className="ui" style={{ color: 'var(--muted)' }}>
      Loading fact…
    </p>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="ui" style={{ color: 'var(--accent)' }}>
      Failed to load fact: {message}
    </p>
  )
}

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div>
      <h1 className="tp-serif" style={{ fontSize: 28, marginBottom: 12 }}>
        Fact not found
      </h1>
      <p className="tp-serif" style={{ color: 'var(--ink-2)' }}>
        We don’t have a wild fact with the slug <code>{slug}</code>. Try the{' '}
        <a href="/facts">facts index</a>.
      </p>
    </div>
  )
}
