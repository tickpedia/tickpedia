import { useEffect, useState } from 'react'
import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { beam } from '../../lib/beam.js'
import { buildDiseasesIndexHead } from './seo.js'

// /diseases — flat sortable index. Pagination is intentionally
// deferred until the list grows past ~30 (currently ~12 entries);
// we serve the full list inline with sortable column headers so the
// page is useful as a sitemap-style overview.

export interface IndexRow {
  id: number
  slug: string
  displayName: string
  oneLiner: string | null
  caseCount: number
  tickCount: number
}

export interface DiseasesIndexPageProps {
  initialRows?: readonly IndexRow[]
}

interface State {
  rows: IndexRow[]
  loading: boolean
  error: Error | null
}

type SortBy = 'name' | 'cases'

export function DiseasesIndexPage({ initialRows = [] }: DiseasesIndexPageProps = {}) {
  const head = buildDiseasesIndexHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const [state, setState] = useState<State>(() => ({
    rows: [...initialRows],
    loading: initialRows.length === 0,
    error: null,
  }))
  const [sortBy, setSortBy] = useState<SortBy>('name')

  useEffect(() => {
    if (initialRows.length > 0) return
    let cancelled = false
    Promise.all([
      beam.diseases.query({
        fields: ['id', 'slug', 'displayName', 'oneLiner'],
        limit: 100,
      }),
      beam.diseaseCountyYear.analyze.casesByYear({}),
      beam.tickDiseases.analyze.ticksPerDisease({}),
    ])
      .then(([diseasesRes, casesRes, ticksRes]) => {
        if (cancelled) return
        const casesById = new Map<number, number>()
        for (const b of casesRes.buckets) {
          const id = Number(b.dims.diseaseId)
          if (!Number.isFinite(id)) continue
          casesById.set(id, (casesById.get(id) ?? 0) + (b.measures.total ?? 0))
        }
        const ticksById = new Map<number, number>()
        for (const b of ticksRes.buckets) {
          const id = Number(b.dims.diseaseId)
          if (!Number.isFinite(id)) continue
          ticksById.set(id, b.measures.count ?? 0)
        }
        const rows: IndexRow[] = diseasesRes.rows.map((d) => ({
          id: d.id,
          slug: d.slug ?? '',
          displayName: d.displayName ?? '',
          oneLiner: d.oneLiner ?? null,
          caseCount: casesById.get(d.id) ?? 0,
          tickCount: ticksById.get(d.id) ?? 0,
        }))
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
  }, [initialRows])

  const sorted = sortRows(state.rows, sortBy)

  return (
    <div className="tp-page" data-testid="diseases-index-page">
      <PageHeader active="diseases" />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Diseases' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 24px' }}>
        <div className="ui eyebrow">Tick-borne illnesses</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(34px, 6vw, 52px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            margin: '8px 0 6px',
          }}
        >
          Diseases
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          Every tick-borne illness Tickpedia tracks. Each row links to its
          encyclopedia entry — case totals, seasonality, and the ticks that
          carry it.
        </p>
      </div>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">All diseases</h2>
          <span className="meta">
            {state.loading
              ? 'loading…'
              : `${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'}`}
          </span>
        </div>

        {state.error && (
          <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Failed to load index: {state.error.message}
          </p>
        )}

        {!state.error && sorted.length > 0 && (
          <table className="tp-table" data-testid="diseases-index-table">
            <thead>
              <tr>
                <th>
                  <SortHeader
                    label="Disease"
                    sortKey="name"
                    activeKey={sortBy}
                    onClick={() => setSortBy('name')}
                  />
                </th>
                <th>One-liner</th>
                <th className="num">
                  <SortHeader
                    label="Cases"
                    sortKey="cases"
                    activeKey={sortBy}
                    onClick={() => setSortBy('cases')}
                  />
                </th>
                <th className="num">Ticks</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id}>
                  <td>
                    <a
                      href={pathFor('disease', { slug: row.slug })}
                      style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                    >
                      {row.displayName}
                    </a>
                  </td>
                  <td style={{ color: 'var(--ink-2)' }}>{row.oneLiner ?? '—'}</td>
                  <td className="num">
                    {row.caseCount > 0 ? row.caseCount.toLocaleString() : '—'}
                  </td>
                  <td className="num">{row.tickCount > 0 ? row.tickCount : '—'}</td>
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

function SortHeader({
  label,
  sortKey,
  activeKey,
  onClick,
}: {
  label: string
  sortKey: SortBy
  activeKey: SortBy
  onClick: () => void
}) {
  const isActive = sortKey === activeKey
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
        fontWeight: isActive ? 600 : 400,
        color: isActive ? 'var(--ink)' : 'var(--ink-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontSize: 11,
      }}
      aria-pressed={isActive}
    >
      {label}
      {isActive && ' ↓'}
    </button>
  )
}

export function sortRows(rows: readonly IndexRow[], by: SortBy): IndexRow[] {
  const out = [...rows]
  if (by === 'name') {
    out.sort((a, b) => a.displayName.localeCompare(b.displayName))
  } else {
    out.sort((a, b) => b.caseCount - a.caseCount || a.displayName.localeCompare(b.displayName))
  }
  return out
}
