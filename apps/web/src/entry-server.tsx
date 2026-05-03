import { renderToString } from 'react-dom/server'
import { App } from './App.js'
import { SSRDataProvider, type DataCache } from './ssr/SSRDataProvider.js'

// SSR entry point. Vite builds this with `vite build --ssr`, the
// prerender script imports the result, calls `render(path, cache)`
// once per canonical URL, and assembles the final HTML. No DOM, no
// `window`, no top-level side effects.

export interface RenderResult {
  /** The string that goes inside `<div id="root">…</div>`. */
  bodyHtml: string
}

export function render(path: string, data: DataCache = {}): RenderResult {
  const tree = (
    <SSRDataProvider data={data}>
      <App pathOverride={path} />
    </SSRDataProvider>
  )
  return { bodyHtml: renderToString(tree) }
}
