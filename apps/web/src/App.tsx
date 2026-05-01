import { SearchBox } from './components/SearchBox'
import { Feed } from './components/Feed'

export function App() {
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
        </footer>
      </main>
      <Feed />
    </div>
  )
}
