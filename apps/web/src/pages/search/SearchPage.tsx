import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { beam } from '../../lib/beam.js'
import { pathFor } from '../../routes/index.js'
import { buildSearchHead } from './seo.js'

// /search?q=<term>
//
// Full-page mixed-entity search. Runs the same five lenses as the
// header `UniversalSearch` dropdown (ticks, diseases, removalTechniques,
// states, counties) but renders results as a flat sectioned list with
// a left-column kind tag — per Decision #9 in plan/design/art-extras.jsx.
//
// The page is URL-driven: it reads `?q=` from `window.location.search`
// on mount and listens for `popstate` so back/forward updates the
// results. Submitting the input replaces history so the URL always
// reflects the active query — that's the share-link contract.

const PER_LENS_LIMIT = 10

const SUGGESTED_QUERIES: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Blacklegged tick', href: '/ticks/blacklegged-tick' },
  { label: 'Lyme disease', href: '/diseases/lyme-disease' },
  { label: 'How to remove a tick', href: '/techniques/fine-tipped-tweezers' },
  { label: 'Pennsylvania', href: '/states/pennsylvania' },
  { label: 'Cumberland, ME', href: '/counties/maine/cumberland' },
]

interface TickHit {
  id: number
  slug: string
  commonName: string
  scientificName: string
}
interface DiseaseHit {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
}
interface TechniqueHit {
  id: number
  slug: string
  title: string
  oneLiner: string | null
  kind: string
}
interface StateHit {
  fips: string
  slug: string
  name: string
}
interface CountyHit {
  fips: string
  slug: string
  countyName: string
  stateFips: string
}

interface AllHits {
  ticks: TickHit[]
  diseases: DiseaseHit[]
  techniques: TechniqueHit[]
  states: StateHit[]
  counties: CountyHit[]
}

const emptyHits = (): AllHits => ({
  ticks: [],
  diseases: [],
  techniques: [],
  states: [],
  counties: [],
})

export interface SearchPageProps {
  /**
   * Override the URL-derived query. Tests pass it explicitly; on the
   * client the page reads `window.location.search` itself.
   */
  initialQuery?: string
}

export function SearchPage({ initialQuery }: SearchPageProps = {}) {
  const [query, setQuery] = useState(() => initialQuery ?? readQueryFromUrl())
  const [submitted, setSubmitted] = useState(query)
  const [hits, setHits] = useState<AllHits>(emptyHits)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [stateSlugByFips, setStateSlugByFips] = useState<Map<string, string>>(
    () => new Map(),
  )
  const requestId = useRef(0)

  const head = buildSearchHead({ query: submitted })
  useDocumentHead({
    title: head.title,
    description: head.description,
    canonicalPath: head.canonicalPath,
  })

  // Listen for back/forward — the URL is the source of truth for
  // the submitted query.
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onPop() {
      const next = readQueryFromUrl()
      setQuery(next)
      setSubmitted(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Pre-load the (small, static) states map once — counties addresses
  // are `/counties/<state-slug>/<county-slug>` and the counties lens
  // hit only carries `stateFips`.
  useEffect(() => {
    let cancelled = false
    beam.states
      .query({ fields: ['fips', 'slug'], limit: 100 })
      .then((res) => {
        if (cancelled) return
        const map = new Map<string, string>()
        for (const row of res.rows ?? []) {
          const fips = typeof row.fips === 'string' ? row.fips : ''
          const slug = typeof row.slug === 'string' ? row.slug : ''
          if (fips && slug) map.set(fips, slug)
        }
        setStateSlugByFips(map)
      })
      .catch(() => {
        // Counties without a resolvable state slug fall back to a
        // search re-run instead of a broken link.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const trimmed = submitted.trim()

  useEffect(() => {
    if (!trimmed) {
      setHits(emptyHits())
      setLoading(false)
      setError(null)
      return
    }
    const id = ++requestId.current
    let cancelled = false
    setLoading(true)
    setError(null)

    type SearchEnvelope = { results?: { metadata: Record<string, unknown> }[] }
    const swallow = (): SearchEnvelope => ({ results: [] })

    Promise.all([
      beam.ticks.search({ query: trimmed, limit: PER_LENS_LIMIT }).catch(swallow) as Promise<SearchEnvelope>,
      beam.diseases.search({ query: trimmed, limit: PER_LENS_LIMIT }).catch(swallow) as Promise<SearchEnvelope>,
      beam.removalTechniques.search({ query: trimmed, limit: PER_LENS_LIMIT }).catch(swallow) as Promise<SearchEnvelope>,
      beam.states.search({ query: trimmed, limit: PER_LENS_LIMIT }).catch(swallow) as Promise<SearchEnvelope>,
      beam.counties.search({ query: trimmed, limit: PER_LENS_LIMIT }).catch(swallow) as Promise<SearchEnvelope>,
    ])
      .then(([ticksRes, diseasesRes, techniquesRes, statesRes, countiesRes]) => {
        if (cancelled || id !== requestId.current) return
        setHits({
          ticks: (ticksRes.results ?? []).map((r) => {
            const m = r.metadata
            return {
              id: typeof m.id === 'number' ? m.id : 0,
              slug: typeof m.slug === 'string' ? m.slug : '',
              commonName: typeof m.commonName === 'string' ? m.commonName : '',
              scientificName: typeof m.scientificName === 'string' ? m.scientificName : '',
            }
          }),
          diseases: (diseasesRes.results ?? []).map((r) => {
            const m = r.metadata
            return {
              id: typeof m.id === 'number' ? m.id : 0,
              slug: typeof m.slug === 'string' ? m.slug : '',
              displayName: typeof m.displayName === 'string' ? m.displayName : '',
              oneLiner: typeof m.oneLiner === 'string' ? m.oneLiner : null,
            }
          }),
          techniques: (techniquesRes.results ?? []).map((r) => {
            const m = r.metadata
            return {
              id: typeof m.id === 'number' ? m.id : 0,
              slug: typeof m.slug === 'string' ? m.slug : '',
              title: typeof m.title === 'string' ? m.title : '',
              oneLiner: typeof m.oneLiner === 'string' ? m.oneLiner : null,
              kind: typeof m.kind === 'string' ? m.kind : 'removal',
            }
          }),
          states: (statesRes.results ?? []).map((r) => {
            const m = r.metadata
            return {
              fips: typeof m.fips === 'string' ? m.fips : '',
              slug: typeof m.slug === 'string' ? m.slug : '',
              name: typeof m.name === 'string' ? m.name : '',
            }
          }),
          counties: (countiesRes.results ?? []).map((r) => {
            const m = r.metadata
            return {
              fips: typeof m.fips === 'string' ? m.fips : '',
              slug: typeof m.slug === 'string' ? m.slug : '',
              countyName: typeof m.countyName === 'string' ? m.countyName : '',
              stateFips: typeof m.stateFips === 'string' ? m.stateFips : '',
            }
          }),
        })
      })
      .catch((err: unknown) => {
        if (cancelled || id !== requestId.current) return
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (cancelled || id !== requestId.current) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [trimmed])

  const totalHits =
    hits.ticks.length +
    hits.diseases.length +
    hits.techniques.length +
    hits.states.length +
    hits.counties.length

  function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const next = query.trim()
    setSubmitted(next)
    pushQueryToUrl(next)
  }

  return (
    <div className="tp-page" data-testid="search-page">
      <PageHeader />

      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Search' },
          ]}
        />
      </div>

      <section className="tp-meta-hero" data-testid="search-hero">
        <div className="ui eyebrow">Search</div>
        <h1 className="tp-serif" data-testid="search-h1">
          {trimmed ? (
            <>
              Results for <em>"{trimmed}"</em>
            </>
          ) : (
            'Search Tickpedia'
          )}
        </h1>
        <p className="tp-serif lede">
          One input, five lenses — ticks, diseases, removal techniques,
          states, and counties. Press Enter to share the link.
        </p>
      </section>

      <section className="tp-meta-body" data-testid="search-body">
        <form
          role="search"
          onSubmit={onSubmit}
          data-testid="search-form"
          style={{ marginBottom: 24 }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticks, diseases, techniques, states, counties…"
            aria-label="Search Tickpedia"
            data-testid="search-input"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: 16,
              fontFamily: 'inherit',
              border: '1px solid var(--rule)',
              borderRadius: 10,
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          />
        </form>

        <SearchResults
          loading={loading}
          error={error}
          hits={hits}
          totalHits={totalHits}
          query={trimmed}
          stateSlugByFips={stateSlugByFips}
        />
      </section>

      <Footer />
    </div>
  )
}

interface SearchResultsProps {
  loading: boolean
  error: Error | null
  hits: AllHits
  totalHits: number
  query: string
  stateSlugByFips: Map<string, string>
}

function SearchResults({
  loading,
  error,
  hits,
  totalHits,
  query,
  stateSlugByFips,
}: SearchResultsProps) {
  if (!query) {
    return (
      <div data-testid="search-empty-prompt">
        <div className="ui eyebrow" style={{ marginBottom: 8 }}>
          Try
        </div>
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          data-testid="search-suggestions"
        >
          {SUGGESTED_QUERIES.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="tp-chip"
              style={{ textDecoration: 'none' }}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    )
  }

  if (loading && totalHits === 0) {
    return (
      <p
        className="ui"
        data-testid="search-loading"
        style={{ fontSize: 13, color: 'var(--muted)' }}
      >
        Searching…
      </p>
    )
  }

  if (error) {
    return (
      <p
        role="alert"
        className="mono"
        data-testid="search-error"
        style={{ fontSize: 13, color: 'var(--accent)' }}
      >
        Search failed: {error.message}
      </p>
    )
  }

  if (totalHits === 0) {
    return (
      <div data-testid="search-no-results">
        <p
          className="tp-serif"
          style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 6 }}
        >
          We don't have anything for "{query}".
        </p>
        <p
          className="tp-serif"
          style={{ fontSize: 14, color: 'var(--muted)' }}
        >
          The encyclopedia covers ticks, diseases, removal techniques,
          states, and counties. Try a broader word, or pick from the
          suggestions below.
        </p>
        <div
          className="ui eyebrow"
          style={{ marginTop: 18, marginBottom: 8 }}
        >
          Try
        </div>
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          data-testid="search-suggestions"
        >
          {SUGGESTED_QUERIES.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="tp-chip"
              style={{ textDecoration: 'none' }}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div data-testid="search-results">
      <ResultGroup
        kind="TICK"
        rows={hits.ticks.map((t) => ({
          key: `tick-${t.id}`,
          href: pathFor('tick', { slug: t.slug }),
          primary: t.commonName,
          secondary: t.scientificName,
        }))}
      />
      <ResultGroup
        kind="DISEASE"
        rows={hits.diseases.map((d) => ({
          key: `disease-${d.id}`,
          href: pathFor('disease', { slug: d.slug }),
          primary: d.displayName,
          secondary: d.oneLiner,
        }))}
      />
      <ResultGroup
        kind="TECHNIQUE"
        rows={hits.techniques.map((t) => ({
          key: `technique-${t.id}`,
          href: pathFor('technique', { slug: t.slug }),
          primary: t.title,
          secondary: t.oneLiner,
        }))}
      />
      <ResultGroup
        kind="STATE"
        rows={hits.states.map((s) => ({
          key: `state-${s.fips}`,
          href: pathFor('state', { slug: s.slug }),
          primary: s.name,
          secondary: null,
        }))}
      />
      <ResultGroup
        kind="COUNTY"
        rows={hits.counties.map((c) => {
          const stateSlug = stateSlugByFips.get(c.stateFips)
          const href = stateSlug
            ? pathFor('county', { state: stateSlug, slug: c.slug })
            : `/search?q=${encodeURIComponent(c.countyName)}`
          return {
            key: `county-${c.fips}`,
            href,
            primary: c.countyName,
            secondary: null,
          }
        })}
      />
    </div>
  )
}

interface ResultRow {
  key: string
  href: string
  primary: string
  secondary: string | null
}

function ResultGroup({
  kind,
  rows,
}: {
  kind: 'TICK' | 'DISEASE' | 'TECHNIQUE' | 'STATE' | 'COUNTY'
  rows: readonly ResultRow[]
}) {
  if (rows.length === 0) return null
  return (
    <div data-testid={`search-group-${kind.toLowerCase()}`}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((row) => (
          <li
            key={row.key}
            style={{ borderBottom: '1px solid var(--rule)' }}
          >
            <a
              href={row.href}
              data-testid={`search-result-${row.key}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px minmax(0, 1fr)',
                gap: 14,
                padding: '12px 0',
                color: 'var(--ink)',
                textDecoration: 'none',
                alignItems: 'baseline',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--accent)',
                  letterSpacing: '0.1em',
                }}
              >
                {kind}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  className="tp-serif"
                  style={{
                    display: 'block',
                    fontSize: 16,
                    lineHeight: 1.3,
                  }}
                >
                  {row.primary}
                </span>
                {row.secondary && (
                  <span
                    className="ui"
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: 'var(--muted)',
                      marginTop: 2,
                    }}
                  >
                    {row.secondary}
                  </span>
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function readQueryFromUrl(): string {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  return params.get('q') ?? ''
}

function pushQueryToUrl(q: string): void {
  if (typeof window === 'undefined') return
  const url = q ? `/search?q=${encodeURIComponent(q)}` : '/search'
  window.history.replaceState(null, '', url)
}
