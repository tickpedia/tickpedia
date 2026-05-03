import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { usePathogen } from './data/usePathogen.js'
import { usePathogenCounties } from './data/usePathogenCounties.js'
import { usePathogenSpread } from './data/usePathogenSpread.js'
import { RangeSection } from './sections/RangeSection.js'
import { SpreadSection } from './sections/SpreadSection.js'
import { buildPathogenSubPageHead } from './seo.js'

// /pathogens/[slug]/range — focused county-presence map + the
// year-over-year cumulative-spread line chart, mirroring TickRangePage's
// breakdown shape.

export interface PathogenRangePageProps {
  slug: string
}

export function PathogenRangePage({ slug }: PathogenRangePageProps) {
  const { pathogen, status, error } = usePathogen(slug)
  const counties = usePathogenCounties(pathogen?.id ?? null)
  const spread = usePathogenSpread(pathogen?.id ?? null)

  const head = pathogen
    ? buildPathogenSubPageHead(pathogen, 'Range')
    : {
        title: 'Pathogen range | Tickpedia',
        description: '',
        canonicalPath: pathFor('pathogen-range', { slug }),
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
    <div className="tp-page" data-testid="pathogen-range-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Pathogens', href: '/pathogens' },
            { label: pathogen.displayName, href: pathFor('pathogen', { slug }) },
            { label: 'Range' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 28px' }}>
        <div className="ui eyebrow">County-level presence</div>
        <h1
          className="tp-serif"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '8px 0 6px' }}
        >
          Where {pathogen.displayName} has been detected
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          Counties with at least one positive surveillance report for {pathogen.displayName},
          aggregated to a state-level choropleth. Click any state to open its page.
        </p>
      </div>

      <RangeSection
        pathogenSlug={pathogen.slug}
        pathogenName={pathogen.displayName}
        data={counties.data}
        loading={counties.loading}
        error={counties.error}
        variant="subpage"
      />

      <SpreadSection
        pathogenName={pathogen.displayName}
        data={spread.data}
        loading={spread.loading}
        error={spread.error}
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
