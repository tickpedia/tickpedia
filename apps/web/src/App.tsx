import { SearchBox } from './components/SearchBox'
import { Feed } from './components/Feed'
import { DesignShowcase } from './design/index.js'

// Phase-1 router shim: while the URL contract scaffolding lands in
// phase 3, dispatch on `window.location.pathname` so the design system
// has a stable review URL (`/design`) without dragging in react-router
// yet. The legacy home stays at `/` so existing tests + the user's
// running dev server keep working.

export function App() {
  const path = typeof window === 'undefined' ? '/' : window.location.pathname
  if (path === '/design' || path === '/design/') return <DesignShowcase />
  return <LegacyHome />
}

function LegacyHome() {
  return (
    <div className="layout">
      <main>
        <header>
          <h1>Tickpedia</h1>
          <p data-testid="tagline">
            Ticks by region. Wild facts. How to get them off you.
          </p>
        </header>

        <SearchBox />

        <footer>
          <small>
            Open source — MIT.{' '}
            <a href="https://github.com/" rel="noreferrer">
              github.com/tickpedia
            </a>
          </small>
          <br />
          <small>
            <a href="/design">Design system preview →</a>
          </small>
        </footer>
      </main>
      <Feed />
    </div>
  )
}
