import { useEffect, useMemo, useState } from 'react'
import { TickCrest } from '@tickpedia/ui'
import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { BarRow } from '../../charts/BarRow/index.js'
import { pathFor } from '../../routes/index.js'
import { beam } from '../../lib/beam.js'
import { buildTicksIndexHead } from './seo.js'

// /ticks — the field-guide index. Three sections in one page:
//
//   1. CrestGallery — every tick rendered as a heraldic medallion
//      with its per-row hero colours. The "wall of ticks" is the
//      visual identity of the page.
//   2. FootprintChart — top-N by established-county count (the
//      `establishedRange` analyse).
//   3. List — a sortable table with the one-liner + counts.
//
// A live search input filters all three. The whole page is
// client-side; the API surface is just `ticks.query` + one analyse.

type DangerLevel = 'low' | 'moderate' | 'high' | 'unknown'

export interface TicksIndexRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
  oneLiner: string | null
  heroHeadColor: string | null
  heroBodyColor: string | null
  heroLegColor: string | null
  dangerLevel: DangerLevel
  counties: number
}

type SortBy = 'name' | 'counties' | 'danger'

interface PageState {
  rows: TicksIndexRow[]
  loading: boolean
  error: Error | null
}

const DANGER_RANK: Record<DangerLevel, number> = {
  high: 3,
  moderate: 2,
  low: 1,
  unknown: 0,
}

const DANGER_COLOR: Record<DangerLevel, string> = {
  high: 'var(--danger-high)',
  moderate: 'var(--danger-mod)',
  low: 'var(--danger-low)',
  unknown: 'var(--rule)',
}

export function TicksIndexPage() {
  const head = buildTicksIndexHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const [state, setState] = useState<PageState>({ rows: [], loading: true, error: null })
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('name')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      beam.ticks.query({
        fields: [
          'id',
          'slug',
          'commonName',
          'scientificName',
          'oneLiner',
          'heroHeadColor',
          'heroBodyColor',
          'heroLegColor',
          'dangerLevel',
        ],
        limit: 200,
      }),
      beam.tickCounty.analyze.establishedRange({}),
    ])
      .then(([ticksRes, rangeRes]) => {
        if (cancelled) return
        const countiesById = new Map<number, number>()
        for (const b of rangeRes.buckets) {
          const id = Number(b.dims.tickId)
          if (!Number.isFinite(id)) continue
          countiesById.set(id, (b.measures as { counties?: number }).counties ?? 0)
        }
        const rows: TicksIndexRow[] = ticksRes.rows
          .map((r) => ({
            id: r.id,
            slug: r.slug ?? '',
            commonName: r.commonName ?? '',
            scientificName: r.scientificName ?? '',
            oneLiner: r.oneLiner ?? null,
            heroHeadColor: r.heroHeadColor ?? null,
            heroBodyColor: r.heroBodyColor ?? null,
            heroLegColor: r.heroLegColor ?? null,
            dangerLevel: normalizeDanger(r.dangerLevel),
            counties: countiesById.get(r.id) ?? 0,
          }))
          .filter((r) => r.slug && r.commonName)
        setState({ rows, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ rows: [], loading: false, error })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => filterRows(state.rows, query), [state.rows, query])
  const sorted = useMemo(() => sortRows(filtered, sortBy), [filtered, sortBy])
  const dangerSummary = useMemo(() => summarizeDanger(state.rows), [state.rows])

  return (
    <div className="tp-page" data-testid="ticks-index-page">
      <PageHeader active="ticks" />

      <div style={{ padding: '20px 32px 0' }}>
        <Crumb items={[{ label: 'Tickpedia', href: '/' }, { label: 'Ticks' }]} />
      </div>

      <div style={{ padding: '24px 32px 8px' }}>
        <div className="ui eyebrow">A field guide</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(34px, 6vw, 52px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            margin: '8px 0 8px',
          }}
        >
          Every tick we track.
        </h1>
        <p
          className="tp-serif"
          style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640, marginBottom: 16 }}
        >
          {state.loading
            ? 'Loading the field guide…'
            : `${state.rows.length} species. Each medallion is hand-coloured from the same SVG silhouette — head, body, and leg colours pulled from the editorial row.`}
        </p>

        <div style={{ maxWidth: 460 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by common or scientific name…"
            aria-label="Filter ticks"
            data-testid="ticks-index-search"
            className="ui"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--rule)',
              borderRadius: 6,
              background: 'var(--surface)',
              color: 'var(--ink)',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
          {query && !state.loading && (
            <p
              className="ui"
              style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}
            >
              {filtered.length} of {state.rows.length} match{' '}
              <code className="mono">{query}</code>
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <section className="tp-section">
          <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Failed to load ticks: {state.error.message}
          </p>
        </section>
      )}

      <CrestGallery rows={sorted} loading={state.loading} />

      <DangerStrip summary={dangerSummary} loading={state.loading} />

      <FootprintChart rows={filtered} loading={state.loading} />

      <ListSection
        rows={sorted}
        loading={state.loading}
        sortBy={sortBy}
        onSortBy={setSortBy}
      />

      <Footer />
    </div>
  )
}

function CrestGallery({
  rows,
  loading,
}: {
  rows: ReadonlyArray<TicksIndexRow>
  loading: boolean
}) {
  return (
    <section className="tp-section" data-testid="ticks-crest-gallery">
      <div className="head">
        <h2 className="tp-serif">Crest gallery</h2>
        <span className="meta">
          {loading ? 'loading…' : `${rows.length} medallions · click to open`}
        </span>
      </div>
      {!loading && rows.length === 0 ? (
        <p className="ui" style={{ color: 'var(--ink-2)', fontSize: 14 }}>
          No matches.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
          }}
        >
          {rows.map((row) => (
            <li key={row.id}>
              <a
                href={pathFor('tick', { slug: row.slug })}
                className="hairline"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '18px 14px 14px',
                  background: 'var(--surface)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: 'var(--ink)',
                  gap: 10,
                  height: '100%',
                }}
                data-testid="ticks-crest-tile"
                aria-label={`${row.commonName} (${row.scientificName})`}
              >
                <TickCrest
                  size="tile"
                  colors={{
                    headColor: row.heroHeadColor ?? '#1c1814',
                    bodyColor: row.heroBodyColor ?? '#8a2a1a',
                    legColor: row.heroLegColor ?? '#1c1814',
                  }}
                  common={row.commonName}
                  scientific={row.scientificName}
                />
                <div style={{ textAlign: 'center', minWidth: 0 }}>
                  <div
                    className="tp-serif"
                    style={{ fontSize: 15, lineHeight: 1.2 }}
                  >
                    {row.commonName}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      fontStyle: 'italic',
                      color: 'var(--muted)',
                      marginTop: 4,
                    }}
                  >
                    {row.scientificName}
                  </div>
                  <DangerDot level={row.dangerLevel} />
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DangerDot({ level }: { level: DangerLevel }) {
  if (level === 'unknown') return null
  return (
    <div
      className="ui"
      style={{
        marginTop: 8,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--muted)',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: DANGER_COLOR[level],
        }}
      />
      {level} risk
    </div>
  )
}

function DangerStrip({
  summary,
  loading,
}: {
  summary: ReadonlyArray<{ level: DangerLevel; count: number; sample: TicksIndexRow[] }>
  loading: boolean
}) {
  if (loading) return null
  const visible = summary.filter((s) => s.count > 0 && s.level !== 'unknown')
  if (visible.length === 0) return null
  return (
    <section className="tp-section" data-testid="ticks-danger-strip">
      <div className="head">
        <h2 className="tp-serif">By risk tier</h2>
        <span className="meta">editorial classification · CDC + ECDC inputs</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
        }}
      >
        {visible.map((s) => (
          <div
            key={s.level}
            className="hairline"
            style={{
              padding: '14px 16px',
              background: 'var(--surface)',
              borderRadius: 6,
              borderLeft: `4px solid ${DANGER_COLOR[s.level]}`,
            }}
          >
            <div className="ui eyebrow" style={{ marginBottom: 6 }}>
              {s.level} risk
            </div>
            <div
              className="tp-serif"
              style={{ fontSize: 28, lineHeight: 1, marginBottom: 6 }}
            >
              {s.count}
            </div>
            <div
              className="ui"
              style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4 }}
            >
              {s.sample
                .slice(0, 3)
                .map((t) => t.commonName)
                .join(', ')}
              {s.sample.length > 3 ? ` and ${s.sample.length - 3} more` : ''}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FootprintChart({
  rows,
  loading,
}: {
  rows: ReadonlyArray<TicksIndexRow>
  loading: boolean
}) {
  if (loading) {
    return (
      <section className="tp-section" data-testid="ticks-footprint">
        <div className="head">
          <h2 className="tp-serif">By county footprint</h2>
          <span className="meta">loading…</span>
        </div>
      </section>
    )
  }
  const ranked = [...rows]
    .filter((r) => r.counties > 0)
    .sort((a, b) => b.counties - a.counties)
    .slice(0, 12)

  if (ranked.length === 0) {
    return (
      <section className="tp-section" data-testid="ticks-footprint">
        <div className="head">
          <h2 className="tp-serif">By county footprint</h2>
        </div>
        <p className="ui" style={{ color: 'var(--ink-2)', fontSize: 14 }}>
          No establishment data for the current filter.
        </p>
      </section>
    )
  }

  return (
    <section className="tp-section" data-testid="ticks-footprint">
      <div className="head">
        <h2 className="tp-serif">By county footprint</h2>
        <span className="meta">CDC tickCounty · status = established</span>
      </div>
      <BarRow
        rows={ranked.map((r) => ({ label: r.commonName, value: r.counties }))}
        fmt={(n) => `${n.toLocaleString()} counties`}
      />
    </section>
  )
}

function ListSection({
  rows,
  loading,
  sortBy,
  onSortBy,
}: {
  rows: ReadonlyArray<TicksIndexRow>
  loading: boolean
  sortBy: SortBy
  onSortBy: (s: SortBy) => void
}) {
  return (
    <section className="tp-section" data-testid="ticks-list">
      <div className="head">
        <h2 className="tp-serif">Every species</h2>
        <span className="meta">
          {loading ? 'loading…' : `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}
        </span>
      </div>
      {!loading && rows.length > 0 && (
        <table className="tp-table" data-testid="ticks-index-table">
          <thead>
            <tr>
              <th>
                <SortHeader
                  label="Tick"
                  active={sortBy === 'name'}
                  onClick={() => onSortBy('name')}
                />
              </th>
              <th>One-liner</th>
              <th className="num">
                <SortHeader
                  label="Counties"
                  active={sortBy === 'counties'}
                  onClick={() => onSortBy('counties')}
                />
              </th>
              <th>
                <SortHeader
                  label="Risk"
                  active={sortBy === 'danger'}
                  onClick={() => onSortBy('danger')}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <a
                    href={pathFor('tick', { slug: r.slug })}
                    style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                  >
                    {r.commonName}
                  </a>
                  <div
                    className="mono"
                    style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--muted)' }}
                  >
                    {r.scientificName}
                  </div>
                </td>
                <td style={{ color: 'var(--ink-2)' }}>{r.oneLiner ?? '—'}</td>
                <td className="num">
                  {r.counties > 0 ? r.counties.toLocaleString() : '—'}
                </td>
                <td>
                  <DangerDot level={r.dangerLevel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--ink)' : 'var(--ink-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontSize: 11,
      }}
      aria-pressed={active}
    >
      {label}
      {active && ' ↓'}
    </button>
  )
}

export function filterRows(
  rows: ReadonlyArray<TicksIndexRow>,
  query: string,
): TicksIndexRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...rows]
  return rows.filter(
    (r) =>
      r.commonName.toLowerCase().includes(q) ||
      r.scientificName.toLowerCase().includes(q) ||
      (r.oneLiner ?? '').toLowerCase().includes(q),
  )
}

export function sortRows(
  rows: ReadonlyArray<TicksIndexRow>,
  by: SortBy,
): TicksIndexRow[] {
  const out = [...rows]
  if (by === 'counties') {
    out.sort((a, b) => b.counties - a.counties || a.commonName.localeCompare(b.commonName))
  } else if (by === 'danger') {
    out.sort(
      (a, b) =>
        DANGER_RANK[b.dangerLevel] - DANGER_RANK[a.dangerLevel] ||
        a.commonName.localeCompare(b.commonName),
    )
  } else {
    out.sort((a, b) => a.commonName.localeCompare(b.commonName))
  }
  return out
}

export function summarizeDanger(
  rows: ReadonlyArray<TicksIndexRow>,
): Array<{ level: DangerLevel; count: number; sample: TicksIndexRow[] }> {
  const order: DangerLevel[] = ['high', 'moderate', 'low', 'unknown']
  const buckets = new Map<DangerLevel, TicksIndexRow[]>()
  for (const level of order) buckets.set(level, [])
  for (const r of rows) buckets.get(r.dangerLevel)!.push(r)
  return order.map((level) => {
    const sample = [...(buckets.get(level) ?? [])].sort((a, b) =>
      a.commonName.localeCompare(b.commonName),
    )
    return { level, count: sample.length, sample }
  })
}

function normalizeDanger(raw: unknown): DangerLevel {
  if (typeof raw !== 'string') return 'unknown'
  const v = raw.toLowerCase()
  if (v === 'high' || v === 'moderate' || v === 'low') return v
  if (v === 'medium') return 'moderate'
  return 'unknown'
}
