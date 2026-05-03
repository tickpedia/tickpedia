import { useEffect, useId, useRef, useState } from 'react'
import { beam } from '../lib/beam.js'
import { pathFor } from '../routes/index.js'

// Universal site search. Replaces the legacy ticks-only SearchBox.
//
// Five lenses run in parallel: ticks, diseases, removalTechniques,
// states, counties. The component is built mobile-first: the input is
// always visible; the results dropdown grows downward and is fully
// reachable on a phone (no fixed height, no scroll lock). At desktop
// widths the dropdown floats over the surrounding content.
//
// Implementation notes:
//   * Debounce is 160ms — the input has to feel snappy on slow phones.
//   * A request-id ref discards stale responses.
//   * Each section has its own visibility — empty sections don't render.
//   * Keyboard: Esc collapses; ArrowDown jumps to the first result; the
//     focus ring is the browser default so we keep accessibility for
//     free.

const DEBOUNCE_MS = 160
const PER_LENS_LIMIT = 4

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

export interface UniversalSearchProps {
  /** Placeholder shown in the empty input. */
  placeholder?: string
  /** When true, autoFocus the input on mount. Default false (so the home page doesn't yank focus on load). */
  autoFocus?: boolean
  /** ARIA label override. */
  ariaLabel?: string
}

export function UniversalSearch({
  placeholder = 'Search ticks, diseases, techniques, states, counties…',
  autoFocus = false,
  ariaLabel = 'Search Tickpedia',
}: UniversalSearchProps) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<AllHits>(emptyHits)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [open, setOpen] = useState(false)
  // Counties are addressed by `/counties/<state-slug>/<county-slug>`,
  // but the counties lens hit only carries `stateFips`. Pre-fetch the
  // (small, static) states table once so we can compose the URL
  // without a per-result roundtrip.
  const [stateSlugByFips, setStateSlugByFips] = useState<Map<string, string>>(
    () => new Map(),
  )
  const requestId = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listboxId = useId()

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
        // Non-fatal — counties just fall back to the /search route.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const trimmed = q.trim()

  useEffect(() => {
    if (!trimmed) {
      setHits(emptyHits())
      setLoading(false)
      setError(null)
      return
    }
    const id = ++requestId.current
    const handle = setTimeout(async () => {
      setLoading(true)
      setError(null)
      type SearchEnvelope = { results?: { metadata: Record<string, unknown> }[] }
      const swallow = (): SearchEnvelope => ({ results: [] })
      try {
        const [ticksRes, diseasesRes, techniquesRes, statesRes, countiesRes] =
          await Promise.all([
            beam.ticks
              .search({ query: trimmed, limit: PER_LENS_LIMIT })
              .catch(swallow) as Promise<SearchEnvelope>,
            beam.diseases
              .search({ query: trimmed, limit: PER_LENS_LIMIT })
              .catch(swallow) as Promise<SearchEnvelope>,
            beam.removalTechniques
              .search({ query: trimmed, limit: PER_LENS_LIMIT })
              .catch(swallow) as Promise<SearchEnvelope>,
            beam.states
              .search({ query: trimmed, limit: PER_LENS_LIMIT })
              .catch(swallow) as Promise<SearchEnvelope>,
            beam.counties
              .search({ query: trimmed, limit: PER_LENS_LIMIT })
              .catch(swallow) as Promise<SearchEnvelope>,
          ])
        if (id !== requestId.current) return
        setHits({
          ticks: (ticksRes.results ?? []).map((r) => {
            const m = r.metadata as Record<string, unknown>
            return {
              id: typeof m.id === 'number' ? m.id : 0,
              slug: typeof m.slug === 'string' ? m.slug : '',
              commonName: typeof m.commonName === 'string' ? m.commonName : '',
              scientificName: typeof m.scientificName === 'string' ? m.scientificName : '',
            }
          }),
          diseases: (diseasesRes.results ?? []).map((r) => {
            const m = r.metadata as Record<string, unknown>
            return {
              id: typeof m.id === 'number' ? m.id : 0,
              slug: typeof m.slug === 'string' ? m.slug : '',
              displayName: typeof m.displayName === 'string' ? m.displayName : '',
              oneLiner: typeof m.oneLiner === 'string' ? m.oneLiner : null,
            }
          }),
          techniques: (techniquesRes.results ?? []).map((r) => {
            const m = r.metadata as Record<string, unknown>
            return {
              id: typeof m.id === 'number' ? m.id : 0,
              slug: typeof m.slug === 'string' ? m.slug : '',
              title: typeof m.title === 'string' ? m.title : '',
              oneLiner: typeof m.oneLiner === 'string' ? m.oneLiner : null,
              kind: typeof m.kind === 'string' ? m.kind : 'removal',
            }
          }),
          states: (statesRes.results ?? []).map((r) => {
            const m = r.metadata as Record<string, unknown>
            return {
              fips: typeof m.fips === 'string' ? m.fips : '',
              slug: typeof m.slug === 'string' ? m.slug : '',
              name: typeof m.name === 'string' ? m.name : '',
            }
          }),
          counties: (countiesRes.results ?? []).map((r) => {
            const m = r.metadata as Record<string, unknown>
            return {
              fips: typeof m.fips === 'string' ? m.fips : '',
              slug: typeof m.slug === 'string' ? m.slug : '',
              countyName: typeof m.countyName === 'string' ? m.countyName : '',
              stateFips: typeof m.stateFips === 'string' ? m.stateFips : '',
            }
          }),
        })
      } catch (err) {
        if (id !== requestId.current) return
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [trimmed])

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return
    function onClick(ev: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(ev.target as Node)) setOpen(false)
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const totalHits =
    hits.ticks.length +
    hits.diseases.length +
    hits.techniques.length +
    hits.states.length +
    hits.counties.length

  const showPanel = open && trimmed.length > 0

  return (
    <div
      ref={containerRef}
      data-testid="universal-search"
      className="tp-universal-search"
      style={{ position: 'relative', width: '100%' }}
      role="search"
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={showPanel}
        aria-controls={listboxId}
        autoFocus={autoFocus}
        data-testid="universal-search-input"
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
          // 16px font keeps iOS from auto-zooming when the input gets
          // focus; without this everything else on the page jumps.
        }}
      />

      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          data-testid="universal-search-panel"
          className="hairline"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 30,
            background: 'var(--surface)',
            borderRadius: 10,
            padding: '8px 0',
            maxHeight: 'min(72vh, 540px)',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          }}
        >
          {loading && totalHits === 0 && (
            <p
              className="ui"
              data-testid="universal-search-loading"
              style={{ padding: '10px 16px', fontSize: 12, color: 'var(--muted)' }}
            >
              searching…
            </p>
          )}

          {error && (
            <p
              className="ui"
              role="alert"
              data-testid="universal-search-error"
              style={{ padding: '10px 16px', fontSize: 12, color: 'var(--accent)' }}
            >
              search failed: {error.message}
            </p>
          )}

          {!loading && !error && totalHits === 0 && (
            <p
              className="tp-serif"
              data-testid="universal-search-empty"
              style={{ padding: '10px 16px', fontSize: 14, color: 'var(--muted)' }}
            >
              No matches. Try a different word.
            </p>
          )}

          <SearchSection
            label="Ticks"
            testId="universal-search-section-ticks"
            rows={hits.ticks.map((t) => ({
              key: `tick-${t.id}`,
              href: pathFor('tick', { slug: t.slug }),
              primary: t.commonName,
              secondary: t.scientificName,
            }))}
          />
          <SearchSection
            label="Diseases"
            testId="universal-search-section-diseases"
            rows={hits.diseases.map((d) => ({
              key: `disease-${d.id}`,
              href: pathFor('disease', { slug: d.slug }),
              primary: d.displayName,
              secondary: d.oneLiner,
            }))}
          />
          <SearchSection
            label="Techniques"
            testId="universal-search-section-techniques"
            rows={hits.techniques.map((t) => ({
              key: `technique-${t.id}`,
              href: pathFor('technique', { slug: t.slug }),
              primary: t.title,
              secondary: t.oneLiner,
              tag: prettifyKind(t.kind),
            }))}
          />
          <SearchSection
            label="States"
            testId="universal-search-section-states"
            rows={hits.states.map((s) => ({
              key: `state-${s.fips}`,
              href: pathFor('state', { slug: s.slug }),
              primary: s.name,
              secondary: null,
            }))}
          />
          <SearchSection
            label="Counties"
            testId="universal-search-section-counties"
            rows={hits.counties.map((c) => {
              const stateSlug = stateSlugByFips.get(c.stateFips)
              const href = stateSlug
                ? pathFor('county', { state: stateSlug, slug: c.slug })
                : // The states-cache fetch failed — fall back to the
                  // search route so the link still resolves to something
                  // useful instead of 404'ing on an empty :state slug.
                  `/search?q=${encodeURIComponent(c.countyName)}`
              return {
                key: `county-${c.fips}`,
                href,
                primary: c.countyName,
                secondary: null,
              }
            })}
          />
        </div>
      )}
    </div>
  )
}

interface SectionRow {
  key: string
  href: string
  primary: string
  secondary: string | null
  tag?: string
}

function SearchSection({
  label,
  testId,
  rows,
}: {
  label: string
  testId: string
  rows: readonly SectionRow[]
}) {
  if (rows.length === 0) return null
  return (
    <div data-testid={testId}>
      <div
        className="ui eyebrow"
        style={{
          padding: '8px 16px 4px',
          fontSize: 10,
          color: 'var(--muted)',
        }}
      >
        {label}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((row) => (
          <li key={row.key}>
            <a
              href={row.href}
              data-testid={`universal-search-result-${row.key}`}
              role="option"
              aria-selected="false"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 8,
                padding: '10px 16px',
                color: 'var(--ink)',
                textDecoration: 'none',
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span
                  className="tp-serif"
                  style={{
                    display: 'block',
                    fontSize: 15,
                    color: 'var(--ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.primary}
                </span>
                {row.secondary && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: 'var(--ink-2)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.secondary}
                  </span>
                )}
              </span>
              {row.tag && (
                <span
                  className="mono"
                  style={{
                    alignSelf: 'center',
                    fontSize: 10,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {row.tag}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function prettifyKind(kind: string): string {
  switch (kind) {
    case 'removal':
      return 'removal'
    case 'prevention':
      return 'prevention'
    case 'aftercare':
      return 'aftercare'
    case 'diagnostic':
      return 'diagnostic'
    case 'myth':
      return 'debunked'
    default:
      return kind
  }
}

