import { useEffect, useState } from 'react'
import { SearchBox } from './components/SearchBox'
import { Feed } from './components/Feed'
import { DesignShowcase } from './design/index.js'
import { matchRoute, type MatchedRoute } from './routes/index.js'
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
import { AboutPage } from './pages/meta/AboutPage.js'
import { SourcesPage } from './pages/meta/SourcesPage.js'
import { ContributePage } from './pages/meta/ContributePage.js'
import { PageHeader, Footer } from './pages/shared/index.js'

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
    if (matched.kind === 'about') return <AboutPage />
    if (matched.kind === 'sources') return <SourcesPage />
    if (matched.kind === 'contribute') return <ContributePage />
  }
  // Everything else falls back to the legacy home until its real page
  // ships. The path is shown so the URL is still useful while pages
  // are being built out.
  return <LegacyHome currentPath={path} />
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

// Featured ticks — surface the pages that are actually shipping today
// so the home isn't a dead end. Order: highest-impact species first.
const FEATURED_TICKS: ReadonlyArray<{ slug: string; common: string; sci: string }> = [
  { slug: 'blacklegged-tick',         common: 'Blacklegged tick',         sci: 'Ixodes scapularis' },
  { slug: 'lone-star-tick',           common: 'Lone star tick',           sci: 'Amblyomma americanum' },
  { slug: 'american-dog-tick',        common: 'American dog tick',        sci: 'Dermacentor variabilis' },
  { slug: 'western-blacklegged-tick', common: 'Western blacklegged tick', sci: 'Ixodes pacificus' },
]

function LegacyHome({ currentPath }: { currentPath: string }) {
  return (
    <div className="tp-page" data-testid="home">
      <PageHeader active="home" />

      <section style={{ padding: '40px 32px 28px' }}>
        <div className="ui eyebrow">A field guide</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(40px, 6vw, 64px)',
            lineHeight: 1.02,
            letterSpacing: '-0.025em',
            margin: '8px 0 12px',
          }}
        >
          Tickpedia
        </h1>
        <p
          data-testid="tagline"
          className="tp-serif"
          style={{
            fontSize: 18,
            color: 'var(--ink-2)',
            maxWidth: 560,
            margin: 0,
          }}
        >
          Ticks by region. Wild facts. How to get them off you.
        </p>

        <div style={{ marginTop: 24, maxWidth: 560 }}>
          <SearchBox />
        </div>

        {currentPath !== '/' && (
          <p
            className="ui"
            style={{ color: 'var(--muted)', fontSize: 13, marginTop: 20 }}
          >
            Page <code className="mono">{currentPath}</code> hasn’t shipped yet.
          </p>
        )}
      </section>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">Featured ticks</h2>
          <a className="ui meta" href="/ticks">All ticks →</a>
        </div>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {FEATURED_TICKS.map((t) => (
            <li key={t.slug}>
              <a
                href={`/ticks/${t.slug}`}
                className="ui"
                style={{
                  display: 'block',
                  padding: '14px 16px',
                  border: '1px solid var(--rule)',
                  background: 'var(--surface)',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div className="tp-serif" style={{ fontSize: 17, color: 'var(--ink)' }}>
                  {t.common}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--mono)',
                    color: 'var(--muted)',
                    marginTop: 4,
                    fontStyle: 'italic',
                  }}
                >
                  {t.sci}
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">Latest wild facts</h2>
          <span className="meta">wildFacts.feeds.latest</span>
        </div>
        <Feed />
      </section>

      <Footer />
    </div>
  )
}
