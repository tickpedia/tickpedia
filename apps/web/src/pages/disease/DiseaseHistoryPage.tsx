import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useDisease } from './data/useDisease.js'
import { useDiseaseHistory } from './data/useDiseaseHistory.js'
import { HistorySection } from './sections/HistorySection.js'
import { buildDiseaseSubPageHead } from './seo.js'

export interface DiseaseHistoryPageProps {
  slug: string
}

export function DiseaseHistoryPage({ slug }: DiseaseHistoryPageProps) {
  const { disease, status, error } = useDisease(slug)
  const history = useDiseaseHistory(disease?.id ?? null)

  const head = disease
    ? buildDiseaseSubPageHead(disease, 'History')
    : {
        title: 'Disease history | Tickpedia',
        description: '',
        canonicalPath: pathFor('disease-history', { slug }),
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

  const total = history.data?.total ?? null
  const years = history.data?.rows.length ?? 0

  return (
    <div className="tp-page" data-testid="disease-history-page">
      <PageHeader active="diseases" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Diseases', href: '/diseases' },
            { label: disease.displayName, href: pathFor('disease', { slug }) },
            { label: 'History' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 28px' }}>
        <div className="ui eyebrow">Year-over-year</div>
        <h1
          className="tp-serif"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '8px 0 6px' }}
        >
          {disease.displayName} cases over time
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          {years > 0 && total !== null
            ? `${total.toLocaleString()} reported ${total === 1 ? 'case' : 'cases'} across ${years} ${years === 1 ? 'year' : 'years'} of CDC surveillance.`
            : `CDC year-over-year totals for ${disease.displayName}.`}
        </p>
      </div>

      <HistorySection
        diseaseSlug={slug}
        diseaseName={disease.displayName}
        data={history.data}
        loading={history.loading}
        error={history.error}
        variant="subpage"
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
