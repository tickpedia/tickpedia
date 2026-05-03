import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { usePathogen } from './data/usePathogen.js'
import { usePathogenDiseases } from './data/usePathogenDiseases.js'
import { DiseasesSection } from './sections/DiseasesSection.js'
import { buildPathogenSubPageHead } from './seo.js'

// /pathogens/[slug]/diseases — diseases this pathogen causes.

export interface PathogenDiseasesPageProps {
  slug: string
}

export function PathogenDiseasesPage({ slug }: PathogenDiseasesPageProps) {
  const { pathogen, status, error } = usePathogen(slug)
  const diseases = usePathogenDiseases(pathogen?.id ?? null)

  const head = pathogen
    ? buildPathogenSubPageHead(pathogen, 'Diseases')
    : {
        title: 'Pathogen diseases | Tickpedia',
        description: '',
        canonicalPath: pathFor('pathogen-diseases', { slug }),
      }

  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    ...(head.description ? { description: head.description } : {}),
  })

  if (status === 'loading') return <Shell>Loading…</Shell>
  if (status === 'error') return <Shell>Failed: {error?.message}</Shell>
  if (status === 'not-found' || !pathogen) {
    return (
      <Shell>
        <h1 className="tp-serif" style={{ fontSize: 28 }}>
          Pathogen not found
        </h1>
        <p className="tp-serif">
          No pathogen with slug <code>{slug}</code>. Try the{' '}
          <a href="/pathogens">pathogens index</a>.
        </p>
      </Shell>
    )
  }

  return (
    <div className="tp-page" data-testid="pathogen-diseases-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Pathogens', href: '/pathogens' },
            { label: pathogen.displayName, href: pathFor('pathogen', { slug }) },
            { label: 'Diseases' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 28px' }}>
        <div className="ui eyebrow">Clinical outcomes</div>
        <h1
          className="tp-serif"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '8px 0 6px' }}
        >
          Diseases caused by {pathogen.displayName}
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          Tick-borne illnesses transmitted by {pathogen.displayName}. Each row links
          to the disease's encyclopedia entry — case totals, seasonality, and the
          ticks that carry it.
        </p>
      </div>

      <DiseasesSection
        rows={diseases.rows}
        loading={diseases.loading}
        error={diseases.error}
        pathogenName={pathogen.displayName}
        anchorId="diseases"
      />

      <Footer />
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader />
      <div style={{ padding: '40px 32px' }}>{children}</div>
      <Footer />
    </div>
  )
}
