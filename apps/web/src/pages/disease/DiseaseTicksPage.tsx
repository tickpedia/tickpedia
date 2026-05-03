import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useDisease } from './data/useDisease.js'
import { useDiseaseTicks } from './data/useDiseaseTicks.js'
import { TicksSection } from './sections/TicksSection.js'
import { buildDiseaseSubPageHead } from './seo.js'

export interface DiseaseTicksPageProps {
  slug: string
}

export function DiseaseTicksPage({ slug }: DiseaseTicksPageProps) {
  const { disease, status, error } = useDisease(slug)
  const ticks = useDiseaseTicks(disease?.id ?? null)

  const head = disease
    ? buildDiseaseSubPageHead(disease, 'Ticks')
    : {
        title: 'Disease ticks | Tickpedia',
        description: '',
        canonicalPath: pathFor('disease-ticks', { slug }),
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
    <div className="tp-page" data-testid="disease-ticks-page">
      <PageHeader active="diseases" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Diseases', href: '/diseases' },
            { label: disease.displayName, href: pathFor('disease', { slug }) },
            { label: 'Ticks' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 28px' }}>
        <div className="ui eyebrow">Vectors</div>
        <h1
          className="tp-serif"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '8px 0 6px' }}
        >
          Ticks that carry {disease.displayName}
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          Tick species the editorial seed associates with {disease.displayName}.
          Each row links to the field-guide entry for that tick.
        </p>
      </div>

      <TicksSection
        rows={ticks.rows}
        loading={ticks.loading}
        error={ticks.error}
        diseaseName={disease.displayName}
        anchorId="ticks"
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
