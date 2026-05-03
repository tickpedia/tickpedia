import { useMemo } from 'react'
import { PageHeader, Footer, useDocumentHead } from '../shared/index.js'
import { useHomeStats } from './data/useHomeStats.js'
import { useHomeHeatmap } from './data/useHomeHeatmap.js'
import { useTrendingDiseases } from './data/useTrendingDiseases.js'
import { useLatestFact } from './data/useLatestFact.js'
import { useRecentlyEstablished } from './data/useRecentlyEstablished.js'
import { HeroSection } from './sections/HeroSection.js'
import { TrendingSection } from './sections/TrendingSection.js'
import { WildFactCard } from './sections/WildFactCard.js'
import { RecentlyEstablishedTicker } from './sections/RecentlyEstablishedTicker.js'
import { QuickStartSection } from './sections/QuickStartSection.js'
import { StatsFooter } from './sections/StatsFooter.js'
import { bucketsToCells } from '../../charts/HexHeatmap/h3-project.js'
import { buildHomeHead } from './seo.js'

// / — site home. Replaces the LegacyHome placeholder. Pulls from five
// hooks in parallel; each section handles its own empty/loading state.

export function HomePage() {
  const head = buildHomeHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const stats = useHomeStats()
  const heatmap = useHomeHeatmap()
  const trending = useTrendingDiseases()
  const fact = useLatestFact()
  const ticker = useRecentlyEstablished()

  const cells = useMemo(
    () => bucketsToCells(heatmap.buckets, { width: 620, height: 300 }),
    [heatmap.buckets],
  )

  return (
    <div className="tp-page" data-testid="home-page">
      <PageHeader active="home" />

      <div style={{ padding: '44px 32px 12px' }}>
        <HeroSection cells={cells} loading={heatmap.loading} />
      </div>

      <RecentlyEstablishedTicker rows={ticker.rows} loading={ticker.loading} />

      <TrendingSection
        rows={trending.rows}
        loading={trending.loading}
        error={trending.error}
      />

      <WildFactCard fact={fact.fact} loading={fact.loading} />

      <QuickStartSection />

      <StatsFooter stats={stats.stats} />

      <Footer />
    </div>
  )
}
