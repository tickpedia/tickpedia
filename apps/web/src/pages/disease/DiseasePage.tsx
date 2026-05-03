import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { useDisease } from './data/useDisease.js'
import { useDiseaseStates } from './data/useDiseaseStates.js'
import {
  useDiseaseSeasonality,
  pickPeakMonth,
} from './data/useDiseaseSeasonality.js'
import { useDiseaseHistory } from './data/useDiseaseHistory.js'
import { useDiseaseTicks } from './data/useDiseaseTicks.js'
import { useDiseasePathogens } from './data/useDiseasePathogens.js'
import { HeroSection } from './sections/HeroSection.js'
import { StatesSection } from './sections/StatesSection.js'
import { SeasonalitySection } from './sections/SeasonalitySection.js'
import { HistorySection } from './sections/HistorySection.js'
import { TicksSection } from './sections/TicksSection.js'
import { PathogensSection } from './sections/PathogensSection.js'
import { RiskCtaSection } from './sections/RiskCtaSection.js'
import { buildDiseaseHead } from './seo.js'
import { stateNameFor } from '../../charts/index.js'

// /diseases/[slug] — the canonical disease encyclopedia page. Like
// the tick page, this is a thin orchestrator that wires up data hooks
// and lets each section render its own slice. Empty / loading / error
// handling lives inside the sections.

export interface DiseasePageProps {
  slug: string
}

export function DiseasePage({ slug }: DiseasePageProps) {
  const { disease, status, error } = useDisease(slug)
  const diseaseId = disease?.id ?? null

  const states = useDiseaseStates(diseaseId)
  const seasonality = useDiseaseSeasonality(diseaseId)
  const history = useDiseaseHistory(diseaseId)
  const ticks = useDiseaseTicks(diseaseId)
  const pathogens = useDiseasePathogens(diseaseId)

  const peak = pickPeakMonth(seasonality.data)
  const totalCases = states.data?.total ?? null
  const stateCount = states.data?.stateCount ?? null
  const topStateName = pickTopStateName(states.data?.byStateFips)
  const latestYear = history.data?.latestYear ?? null
  const tickCount = ticks.loading ? null : ticks.rows.length
  const topPathogen = pathogens.rows[0]?.displayName ?? null

  const head = disease
    ? buildDiseaseHead(disease, {
        totalCases,
        states: stateCount,
        topPathogen,
        peakMonth: peak.monthName,
      })
    : status === 'not-found'
      ? { title: 'Disease not found | Tickpedia', description: '', canonicalPath: `/diseases/${slug}` }
      : { title: 'Loading… | Tickpedia', description: '', canonicalPath: `/diseases/${slug}` }

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
  if (status === 'not-found' || !disease) {
    return <PageScaffold><NotFoundState slug={slug} /></PageScaffold>
  }

  return (
    <div className="tp-page" data-testid="disease-page">
      <PageHeader active="diseases" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Diseases', href: '/diseases' },
            { label: disease.displayName },
          ]}
        />
      </div>
      <HeroSection
        disease={disease}
        totalCases={totalCases}
        stateCount={stateCount}
        topStateName={topStateName}
        latestYear={latestYear}
        peak={peak}
        tickCount={tickCount}
      />
      <RiskCtaSection
        diseaseSlug={disease.slug}
        diseaseName={disease.displayName}
        stateCount={stateCount}
        totalCases={totalCases}
      />
      <StatesSection
        diseaseSlug={disease.slug}
        diseaseName={disease.displayName}
        data={states.data}
        loading={states.loading}
        error={states.error}
      />
      <SeasonalitySection
        diseaseSlug={disease.slug}
        diseaseName={disease.displayName}
        data={seasonality.data}
        loading={seasonality.loading}
        error={seasonality.error}
      />
      <HistorySection
        diseaseSlug={disease.slug}
        diseaseName={disease.displayName}
        data={history.data}
        loading={history.loading}
        error={history.error}
      />
      <TicksSection
        rows={ticks.rows}
        loading={ticks.loading}
        error={ticks.error}
        diseaseName={disease.displayName}
      />
      <PathogensSection
        rows={pathogens.rows}
        loading={pathogens.loading}
        error={pathogens.error}
        diseaseName={disease.displayName}
      />
      <Footer />
    </div>
  )
}

function pickTopStateName(byStateFips: Record<string, number> | undefined): string | null {
  if (!byStateFips) return null
  let topFips: string | null = null
  let topCount = 0
  for (const [fips, count] of Object.entries(byStateFips)) {
    if (count > topCount) {
      topCount = count
      topFips = fips
    }
  }
  if (!topFips) return null
  const code = USPS_BY_FIPS[topFips]
  return code ? stateNameFor(code) : null
}

function PageScaffold({ children }: { children: React.ReactNode }) {
  return (
    <div className="tp-page">
      <PageHeader active="diseases" />
      <div style={{ padding: '40px 32px' }}>{children}</div>
      <Footer />
    </div>
  )
}

function LoadingState() {
  return (
    <p className="ui" style={{ color: 'var(--muted)' }}>
      Loading disease…
    </p>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="ui" style={{ color: 'var(--accent)' }}>
      Failed to load disease: {message}
    </p>
  )
}

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div>
      <h1 className="tp-serif" style={{ fontSize: 28, marginBottom: 12 }}>
        Disease not found
      </h1>
      <p className="tp-serif" style={{ color: 'var(--ink-2)' }}>
        We don’t have a disease with the slug <code>{slug}</code>. Try the{' '}
        <a href="/diseases">diseases index</a>.
      </p>
    </div>
  )
}

const USPS_BY_FIPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY',
}
