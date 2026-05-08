import { useEffect } from 'react'
import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { UniversalSearch } from '../../components/UniversalSearch.js'

// /404 + every unmatched URL. The page is intentionally typographic:
// no SemiLayer reads, renders synchronously, and ships as the SPA
// fallback for any path GitHub Pages can't find on disk.
//
// Stable encyclopedic counts in the lede mirror the design's numbers
// from `plan/design/art-extras.jsx` and are stable enough to live as
// constants — a runtime count fetch on a 404 surface costs more than
// it earns. Audit quarterly.

const ENCYCLOPEDIA_SCALE = {
  ticks: 17,
  diseases: 21,
  techniques: 24,
  facts: 99,
  states: 51,
  counties: 3146,
}

const POPULAR_DESTINATIONS: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Blacklegged tick', href: '/ticks/blacklegged-tick' },
  { label: 'Lyme disease', href: '/diseases/lyme-disease' },
  { label: 'How to remove a tick', href: '/techniques/fine-tipped-tweezers' },
  { label: 'Pennsylvania', href: '/states/pennsylvania' },
  { label: 'Risk map', href: '/risk' },
]

export interface NotFoundPageProps {
  /**
   * Path the user actually requested. Defaults to the live URL on the
   * client; SSR / tests can pass it explicitly. Falls back to "/" when
   * no DOM is present so the rendered HTML never carries an empty
   * code-block.
   */
  currentPath?: string
}

export function NotFoundPage({ currentPath }: NotFoundPageProps = {}) {
  const path =
    currentPath ??
    (typeof window === 'undefined' ? '/' : window.location.pathname)

  useDocumentHead({
    title: 'Page not found — Tickpedia',
    description:
      "The URL isn't a route we recognize. Try the search, or head back to the encyclopedia.",
    canonicalPath: '/404',
  })

  // Tell crawlers not to index 404 surfaces. Set as a side-effect so the
  // tag survives across SPA navigations into and out of the page.
  useEffect(() => {
    if (typeof document === 'undefined') return
    let meta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    )
    const created = !meta
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex, follow')
    return () => {
      if (created) meta?.remove()
    }
  }, [])

  return (
    <div className="tp-page" data-testid="not-found">
      <PageHeader />

      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Not found' },
          ]}
        />
      </div>

      <section className="tp-meta-hero" data-testid="not-found-hero">
        <div className="ui eyebrow" data-testid="not-found-eyebrow">
          404 · Not in encyclopedia
        </div>
        <h1 className="tp-serif">Not on the map.</h1>
        <p className="tp-serif lede">
          <code className="mono" data-testid="not-found-path">
            {path}
          </code>{' '}
          isn't a route we recognize. The encyclopedia covers{' '}
          {ENCYCLOPEDIA_SCALE.ticks} ticks,{' '}
          {ENCYCLOPEDIA_SCALE.diseases} diseases,{' '}
          {ENCYCLOPEDIA_SCALE.techniques} techniques,{' '}
          {ENCYCLOPEDIA_SCALE.facts} wild facts,{' '}
          {ENCYCLOPEDIA_SCALE.states} states, and{' '}
          {ENCYCLOPEDIA_SCALE.counties.toLocaleString()} counties — try the
          search, the chips below, or head back to{' '}
          <a href="/">Tickpedia home</a>.
        </p>
      </section>

      <section className="tp-meta-body" data-testid="not-found-body">
        <div data-testid="not-found-search">
          <UniversalSearch autoFocus />
        </div>

        <div className="ui eyebrow" style={{ margin: '24px 0 8px' }}>
          Try
        </div>
        <div
          data-testid="not-found-chips"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {POPULAR_DESTINATIONS.map((d) => (
            <a
              key={d.href}
              href={d.href}
              className="tp-chip"
              style={{ textDecoration: 'none' }}
              data-testid={`not-found-chip-${d.href.replace(/^\//, '').replace(/\//g, '-')}`}
            >
              {d.label}
            </a>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
