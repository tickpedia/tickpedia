import { useEffect, useState } from 'react'
import { DesignShowcase } from './design/index.js'
import { matchRoute, type MatchedRoute } from './routes/index.js'
import { HomePage } from './pages/home/HomePage.js'
import { RiskPage } from './pages/risk/RiskPage.js'
import { RiskDiseasePage } from './pages/risk/RiskDiseasePage.js'
import { SeasonPage } from './pages/season/SeasonPage.js'
import { TickPage } from './pages/tick/TickPage.js'
import { TickRangePage } from './pages/tick/TickRangePage.js'
import { DiseasesIndexPage } from './pages/disease/DiseasesIndexPage.js'
import { DiseasePage } from './pages/disease/DiseasePage.js'
import { DiseaseStatesPage } from './pages/disease/DiseaseStatesPage.js'
import { DiseaseSeasonalityPage } from './pages/disease/DiseaseSeasonalityPage.js'
import { DiseaseHistoryPage } from './pages/disease/DiseaseHistoryPage.js'
import { DiseaseTicksPage } from './pages/disease/DiseaseTicksPage.js'
import { DiseasePathogensPage } from './pages/disease/DiseasePathogensPage.js'
import { TechniquesIndexPage } from './pages/technique/TechniquesIndexPage.js'
import { TechniquePage } from './pages/technique/TechniquePage.js'
import { StatesIndexPage } from './pages/state/StatesIndexPage.js'
import { StatePage } from './pages/state/StatePage.js'
import { StateTicksPage } from './pages/state/StateTicksPage.js'
import { StateDiseasesPage } from './pages/state/StateDiseasesPage.js'
import { StateCountiesPage } from './pages/state/StateCountiesPage.js'
import { CountiesLeaderboardPage } from './pages/county/CountiesLeaderboardPage.js'
import { CountyPage } from './pages/county/CountyPage.js'
import { FactsIndexPage } from './pages/fact/FactsIndexPage.js'
import { FactPage } from './pages/fact/FactPage.js'
import { AboutPage } from './pages/meta/AboutPage.js'
import { SourcesPage } from './pages/meta/SourcesPage.js'
import { ContributePage } from './pages/meta/ContributePage.js'
import { PageHeader, Footer } from './pages/shared/index.js'
import { SearchBox } from './components/SearchBox.js'

// Pathname-driven router. SPA — every path lives in one bundle, the
// router below picks the page off `window.location.pathname` and the
// matched URL contract pattern. Browser back/forward fires `popstate`;
// we re-match on each one.
//
// `/design` stays special-cased on top so the design showcase is
// reachable without going through the URL contract.
//
// `pathOverride` lets the SSR prerender pass the path explicitly
// (server has no `window`). On the client it stays undefined; the
// hook reads `window.location.pathname` and listens to `popstate`.

export interface AppProps {
  pathOverride?: string
}

export function App({ pathOverride }: AppProps = {}) {
  const path = useLocationPath(pathOverride)
  if (path === '/design' || path === '/design/') return <DesignShowcase />

  const matched = matchRoute(path)
  return <RouteSwitch path={path} matched={matched} />
}

function RouteSwitch({ path, matched }: { path: string; matched: MatchedRoute | null }) {
  if (matched) {
    if (matched.kind === 'home') return <HomePage />
    if (matched.kind === 'risk') return <RiskPage />
    if (matched.kind === 'risk-disease' && matched.params.slug) {
      return <RiskDiseasePage slug={matched.params.slug} />
    }
    if (matched.kind === 'season') return <SeasonPage />
    if (matched.kind === 'tick' && matched.params.slug) {
      return <TickPage slug={matched.params.slug} />
    }
    if (matched.kind === 'tick-range' && matched.params.slug) {
      return <TickRangePage slug={matched.params.slug} />
    }
    if (matched.kind === 'diseases-index') return <DiseasesIndexPage />
    if (matched.kind === 'disease' && matched.params.slug) {
      return <DiseasePage slug={matched.params.slug} />
    }
    if (matched.kind === 'disease-states' && matched.params.slug) {
      return <DiseaseStatesPage slug={matched.params.slug} />
    }
    if (matched.kind === 'disease-seasonality' && matched.params.slug) {
      return <DiseaseSeasonalityPage slug={matched.params.slug} />
    }
    if (matched.kind === 'disease-history' && matched.params.slug) {
      return <DiseaseHistoryPage slug={matched.params.slug} />
    }
    if (matched.kind === 'disease-ticks' && matched.params.slug) {
      return <DiseaseTicksPage slug={matched.params.slug} />
    }
    if (matched.kind === 'disease-pathogens' && matched.params.slug) {
      return <DiseasePathogensPage slug={matched.params.slug} />
    }
    if (matched.kind === 'techniques-index') return <TechniquesIndexPage />
    if (matched.kind === 'technique' && matched.params.slug) {
      return <TechniquePage slug={matched.params.slug} />
    }
    if (matched.kind === 'states-index') return <StatesIndexPage />
    if (matched.kind === 'state' && matched.params.slug) {
      return <StatePage slug={matched.params.slug} />
    }
    if (matched.kind === 'state-ticks' && matched.params.slug) {
      return <StateTicksPage slug={matched.params.slug} />
    }
    if (matched.kind === 'state-diseases' && matched.params.slug) {
      return <StateDiseasesPage slug={matched.params.slug} />
    }
    if (matched.kind === 'state-counties' && matched.params.slug) {
      return <StateCountiesPage slug={matched.params.slug} />
    }
    if (matched.kind === 'counties-leaderboard') return <CountiesLeaderboardPage />
    if (matched.kind === 'county' && matched.params.state && matched.params.slug) {
      return <CountyPage stateSlug={matched.params.state} countySlug={matched.params.slug} />
    }
    if (matched.kind === 'facts-index') return <FactsIndexPage />
    if (matched.kind === 'fact' && matched.params.slug) {
      return <FactPage slug={matched.params.slug} />
    }
    if (matched.kind === 'about') return <AboutPage />
    if (matched.kind === 'sources') return <SourcesPage />
    if (matched.kind === 'contribute') return <ContributePage />
  }
  // Unmatched URL — show a "not found" panel that still surfaces a
  // search box so the user can pivot. The previous LegacyHome stub
  // doubled as the fallback; now that the real HomePage owns `/`, the
  // fallback is its own thing.
  return <NotFound currentPath={path} />
}

function NotFound({ currentPath }: { currentPath: string }) {
  return (
    <div className="tp-page" data-testid="not-found">
      <PageHeader />
      <section style={{ padding: '64px 32px 28px' }}>
        <div className="ui eyebrow">404</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(40px, 6vw, 64px)',
            lineHeight: 1.02,
            letterSpacing: '-0.025em',
            margin: '8px 0 12px',
          }}
        >
          Not on the map.
        </h1>
        <p
          className="tp-serif"
          style={{ fontSize: 18, color: 'var(--ink-2)', maxWidth: 560 }}
        >
          <code className="mono">{currentPath}</code> isn't a route we
          recognize. Try the search, or head back to{' '}
          <a href="/">Tickpedia home</a>.
        </p>
        <div style={{ marginTop: 24, maxWidth: 560 }}>
          <SearchBox />
        </div>
      </section>
      <Footer />
    </div>
  )
}

function useLocationPath(override?: string): string {
  const [path, setPath] = useState(() => {
    if (override !== undefined) return override
    return typeof window === 'undefined' ? '/' : window.location.pathname
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return path
}

