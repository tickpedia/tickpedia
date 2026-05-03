import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { usePathogen } from './data/usePathogen.js'
import { usePathogenTicks } from './data/usePathogenTicks.js'
import { TicksSection } from './sections/TicksSection.js'
import { buildPathogenSubPageHead } from './seo.js'

// /pathogens/[slug]/ticks — vector list. Same shape as
// /diseases/[slug]/ticks: H1, lede, then the linkable table.

export interface PathogenTicksPageProps {
  slug: string
}

export function PathogenTicksPage({ slug }: PathogenTicksPageProps) {
  const { pathogen, status, error } = usePathogen(slug)
  const ticks = usePathogenTicks(pathogen?.id ?? null)

  const head = pathogen
    ? buildPathogenSubPageHead(pathogen, 'Ticks')
    : {
        title: 'Pathogen ticks | Tickpedia',
        description: '',
        canonicalPath: pathFor('pathogen-ticks', { slug }),
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
    <div className="tp-page" data-testid="pathogen-ticks-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Pathogens', href: '/pathogens' },
            { label: pathogen.displayName, href: pathFor('pathogen', { slug }) },
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
          Ticks that carry {pathogen.displayName}
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          Tick species the editorial seed associates with {pathogen.displayName}.
          Each row links to the field-guide entry for that tick.
        </p>
      </div>

      <TicksSection
        rows={ticks.rows}
        loading={ticks.loading}
        error={ticks.error}
        pathogenName={pathogen.displayName}
        anchorId="ticks"
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
