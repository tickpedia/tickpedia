import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { useTechniquesIndex } from './data/useTechniquesIndex.js'
import type { TechniqueIndexRow } from './data/useTechniquesIndex.js'
import type { TechniqueKind } from './data/useTechnique.js'
import { beam } from '../../lib/beam.js'
import { buildTechniquesIndexHead } from './seo.js'

// /techniques — searchable index across removal, prevention, aftercare,
// diagnostic, and debunked-myth entries. The kind chip row filters the
// alphabetical default; once the user types, results come from
// SemiLayer's semantic search instead of the in-memory list (so a
// query like "bullseye rash" surfaces the right entries even when no
// title contains that phrase).

const ALL_KINDS: readonly { kind: TechniqueKind | 'all'; label: string }[] = [
  { kind: 'all', label: 'All' },
  { kind: 'removal', label: 'Removal' },
  { kind: 'prevention', label: 'Prevention' },
  { kind: 'aftercare', label: 'Aftercare' },
  { kind: 'diagnostic', label: 'Diagnostic' },
  { kind: 'myth', label: 'Debunked' },
]

const SEARCH_DEBOUNCE_MS = 180

export function TechniquesIndexPage() {
  const head = buildTechniquesIndexHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const { rows, loading, error } = useTechniquesIndex()
  const [activeKind, setActiveKind] = useState<TechniqueKind | 'all'>('all')
  const [query, setQuery] = useState('')
  const [searchRows, setSearchRows] = useState<TechniqueIndexRow[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<Error | null>(null)
  const requestId = useRef(0)

  const trimmed = query.trim()
  useEffect(() => {
    if (!trimmed) {
      setSearchRows(null)
      setSearching(false)
      setSearchError(null)
      return
    }
    const id = ++requestId.current
    const handle = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const res = await beam.removalTechniques.search({
          query: trimmed,
          limit: 60,
        })
        if (id !== requestId.current) return
        const ALLOWED: readonly TechniqueKind[] = [
          'removal',
          'prevention',
          'aftercare',
          'diagnostic',
          'myth',
        ]
        const out: TechniqueIndexRow[] = (res.results ?? []).map((r) => {
          const m = r.metadata as Record<string, unknown>
          const kindRaw = typeof m.kind === 'string' ? m.kind : 'removal'
          const kind = (ALLOWED as readonly string[]).includes(kindRaw)
            ? (kindRaw as TechniqueKind)
            : 'removal'
          const score =
            kind === 'prevention' && typeof m.preventionScore === 'number'
              ? m.preventionScore
              : null
          return {
            id: typeof m.id === 'number' ? m.id : 0,
            slug: typeof m.slug === 'string' ? m.slug : '',
            title: typeof m.title === 'string' ? m.title : '',
            oneLiner: typeof m.oneLiner === 'string' ? m.oneLiner : null,
            kind,
            preventionScore: score,
          }
        })
        setSearchRows(out)
      } catch (err) {
        if (id !== requestId.current) return
        setSearchError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (id === requestId.current) setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [trimmed])

  const visibleRows = useMemo(() => {
    const source = searchRows ?? rows
    if (activeKind === 'all') return source
    return source.filter((r) => r.kind === activeKind)
  }, [rows, searchRows, activeKind])

  const counts = useMemo(() => {
    const map: Record<TechniqueKind | 'all', number> = {
      all: rows.length,
      removal: 0,
      prevention: 0,
      aftercare: 0,
      diagnostic: 0,
      myth: 0,
    }
    for (const r of rows) map[r.kind] += 1
    return map
  }, [rows])

  const isSearching = trimmed.length > 0
  const showLoading = isSearching ? searching && !searchRows : loading
  const headerCount = visibleRows.length

  return (
    <div className="tp-page" data-testid="techniques-index-page">
      <PageHeader active="techniques" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Techniques' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 24px' }}>
        <div className="ui eyebrow">Removal · Prevention · Aftercare · Diagnostic · Debunked</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(34px, 6vw, 52px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            margin: '8px 0 6px',
          }}
        >
          Techniques
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          How to take a tick off, how to keep them off, what to do after a
          bite, and the folk methods to ignore. Sourced from CDC, EPA, and
          the ticks-and-pathogens literature.
        </p>

        <div style={{ marginTop: 22, maxWidth: 640 }} data-testid="techniques-search-wrap">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search techniques · e.g. bullseye rash, permethrin, doxycycline…"
            aria-label="Search techniques"
            data-testid="techniques-search-input"
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 16,
              fontFamily: 'inherit',
              border: '1px solid var(--rule)',
              borderRadius: 8,
              background: 'var(--surface)',
              color: 'var(--ink)',
            }}
          />
          {searching && (
            <p
              className="ui"
              data-testid="techniques-search-status"
              style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}
            >
              searching…
            </p>
          )}
          {searchError && (
            <p
              className="ui"
              role="alert"
              data-testid="techniques-search-error"
              style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)' }}
            >
              search failed: {searchError.message}
            </p>
          )}
        </div>

        <div
          className="ui chips"
          data-testid="techniques-kind-filter"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 14,
          }}
        >
          {ALL_KINDS.map(({ kind, label }) => {
            const active = activeKind === kind
            const count = kind === 'all' ? counts.all : counts[kind]
            return (
              <button
                key={kind}
                type="button"
                onClick={() => setActiveKind(kind)}
                className="tp-chip"
                data-testid={`kind-chip-${kind}`}
                data-active={active ? 'on' : 'off'}
                aria-pressed={active}
                style={{
                  cursor: 'pointer',
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? '#fff' : 'var(--ink-2)',
                  border: '1px solid var(--rule)',
                }}
              >
                {label} <span style={{ opacity: 0.7 }}>· {count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">
            {isSearching ? `Results for “${trimmed}”` : 'All techniques'}
          </h2>
          <span className="meta">
            {showLoading
              ? 'loading…'
              : `${headerCount} ${headerCount === 1 ? 'entry' : 'entries'}`}
          </span>
        </div>

        {error && (
          <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Failed to load index: {error.message}
          </p>
        )}

        {!error && visibleRows.length === 0 && !showLoading && (
          <p className="tp-serif" style={{ fontSize: 14, color: 'var(--muted)' }}>
            {isSearching
              ? 'No techniques match. Try a different query, or clear the search.'
              : 'No techniques recorded.'}
          </p>
        )}

        {!error && visibleRows.length > 0 && (
          <table className="tp-table" data-testid="techniques-index-table">
            <thead>
              <tr>
                <th>Technique</th>
                <th>Kind</th>
                <th>One-liner</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} data-testid={`technique-row-${row.slug}`} data-kind={row.kind}>
                  <td>
                    <a
                      href={pathFor('technique', { slug: row.slug })}
                      style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                    >
                      {row.title}
                    </a>
                  </td>
                  <td style={{ color: 'var(--ink-2)' }}>
                    <KindBadge kind={row.kind} score={row.preventionScore} />
                  </td>
                  <td style={{ color: 'var(--ink-2)' }}>{row.oneLiner ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Footer />
    </div>
  )
}

function KindBadge({ kind, score }: { kind: TechniqueKind; score: number | null }) {
  const isMyth = kind === 'myth'
  const isPrevention = kind === 'prevention'
  return (
    <span
      className="mono"
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 999,
        border: '1px solid var(--rule)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: isMyth ? 'var(--accent)' : 'var(--ink-2)',
        background: isMyth ? 'rgba(196, 28, 30, 0.06)' : 'var(--surface)',
      }}
    >
      {kind}
      {isPrevention && score !== null ? ` · ${score}/10` : null}
    </span>
  )
}
