import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App.js'
import { SSRDataProvider, readWindowDataCache } from './ssr/SSRDataProvider.js'
import './design/tokens.css'
import './styles.css'

// Replaces the old `main.tsx`. Hydrates the prerendered HTML when the
// root element already has children (SSR-served URLs); falls back to
// `createRoot` when it's empty (dev mode, alias stubs, the SPA 404
// fallback). Either way React picks up `window.__TICKPEDIA_DATA__`
// via `SSRDataProvider` so the data hooks return prefetched rows
// synchronously on first render.

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root not found')

const data = readWindowDataCache()
const tree = (
  <StrictMode>
    <SSRDataProvider data={data}>
      <App />
    </SSRDataProvider>
  </StrictMode>
)

if (rootEl.firstChild) {
  hydrateRoot(rootEl, tree)
} else {
  createRoot(rootEl).render(tree)
}
