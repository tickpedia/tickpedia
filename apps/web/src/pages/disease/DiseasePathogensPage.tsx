import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useDisease } from './data/useDisease.js'
import { useDiseasePathogens } from './data/useDiseasePathogens.js'
import { PathogensSection } from './sections/PathogensSection.js'
import { buildDiseaseSubPageHead } from './seo.js'

export interface DiseasePathogensPageProps {
  slug: string
}

export function DiseasePathogensPage({ slug }: DiseasePathogensPageProps) {
  const { disease, status, error } = useDisease(slug)
  const pathogens = useDiseasePathogens(disease?.id ?? null)

  const head = disease
    ? buildDiseaseSubPageHead(disease, 'Pathogens')
    : {
        title: 'Disease pathogens | Tickpedia',
        description: '',
        canonicalPath: pathFor('disease-pathogens', { slug }),
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
    <div className="tp-page" data-testid="disease-pathogens-page">
      <PageHeader active="diseases" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Diseases', href: '/diseases' },
            { label: disease.displayName, href: pathFor('disease', { slug }) },
            { label: 'Pathogens' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 28px' }}>
        <div className="ui eyebrow">Etiological agents</div>
        <h1
          className="tp-serif"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '8px 0 6px' }}
        >
          Pathogens that cause {disease.displayName}
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          The organisms tick vectors transmit to cause {disease.displayName}.
          Pathogen pages render the same shape as tick and disease entries —
          range, vectors, and the diseases they cause.
        </p>
      </div>

      <PathogensSection
        rows={pathogens.rows}
        loading={pathogens.loading}
        error={pathogens.error}
        diseaseName={disease.displayName}
        anchorId="pathogens"
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
