import { useState } from 'react'
import { PageHeader, Crumb, Footer, useDocumentHead } from '../shared/index.js'
import { pathFor } from '../../routes/index.js'
import { usePathogensIndex, type PathogenIndexRow } from './data/usePathogensIndex.js'
import { buildPathogensIndexHead } from './seo.js'

// /pathogens — flat sortable index. ~7 rows today; pagination is
// deferred until the list grows. Mirrors DiseasesIndexPage shape so
// users learn one pattern across the entity indices.

type SortBy = 'name' | 'ticks' | 'diseases'

export function PathogensIndexPage() {
  const head = buildPathogensIndexHead()
  useDocumentHead({
    title: head.title,
    canonicalPath: head.canonicalPath,
    description: head.description,
  })

  const { rows, loading, error } = usePathogensIndex()
  const [sortBy, setSortBy] = useState<SortBy>('name')

  const sorted = sortRows(rows, sortBy)

  return (
    <div className="tp-page" data-testid="pathogens-index-page">
      <PageHeader />
      <div style={{ padding: '20px 32px 0' }}>
        <Crumb
          items={[
            { label: 'Tickpedia', href: '/' },
            { label: 'Pathogens' },
          ]}
        />
      </div>

      <div style={{ padding: '20px 32px 24px' }}>
        <div className="ui eyebrow">Tick-borne pathogens</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 'clamp(34px, 6vw, 52px)',
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            margin: '8px 0 6px',
          }}
        >
          Pathogens
        </h1>
        <p className="tp-serif" style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 640 }}>
          The organisms tick vectors transmit. Each row links to the canonical
          pathogen page — vectors, county-level presence, and the diseases each
          one causes.
        </p>
      </div>

      <section className="tp-section">
        <div className="head">
          <h2 className="tp-serif">All pathogens</h2>
          <span className="meta">
            {loading
              ? 'loading…'
              : `${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'}`}
          </span>
        </div>

        {error && (
          <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
            Failed to load index: {error.message}
          </p>
        )}

        {!error && sorted.length > 0 && (
          <table className="tp-table" data-testid="pathogens-index-table">
            <thead>
              <tr>
                <th>
                  <SortHeader
                    label="Pathogen"
                    sortKey="name"
                    activeKey={sortBy}
                    onClick={() => setSortBy('name')}
                  />
                </th>
                <th>Scientific name</th>
                <th>One-liner</th>
                <th className="num">
                  <SortHeader
                    label="Ticks"
                    sortKey="ticks"
                    activeKey={sortBy}
                    onClick={() => setSortBy('ticks')}
                  />
                </th>
                <th className="num">
                  <SortHeader
                    label="Diseases"
                    sortKey="diseases"
                    activeKey={sortBy}
                    onClick={() => setSortBy('diseases')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id}>
                  <td>
                    <a
                      href={pathFor('pathogen', { slug: row.slug })}
                      style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}
                    >
                      {row.displayName}
                    </a>
                  </td>
                  <td
                    style={{
                      color: 'var(--muted)',
                      fontStyle: 'italic',
                      fontFamily: 'Newsreader, serif',
                    }}
                  >
                    {row.scientificName}
                  </td>
                  <td style={{ color: 'var(--ink-2)' }}>{row.oneLiner ?? '—'}</td>
                  <td className="num">{row.tickCount > 0 ? row.tickCount : '—'}</td>
                  <td className="num">{row.diseaseCount > 0 ? row.diseaseCount : '—'}</td>
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

export function sortRows(rows: readonly PathogenIndexRow[], by: SortBy): PathogenIndexRow[] {
  const out = [...rows]
  if (by === 'name') {
    out.sort((a, b) => a.displayName.localeCompare(b.displayName))
  } else if (by === 'ticks') {
    out.sort(
      (a, b) => b.tickCount - a.tickCount || a.displayName.localeCompare(b.displayName),
    )
  } else {
    out.sort(
      (a, b) => b.diseaseCount - a.diseaseCount || a.displayName.localeCompare(b.displayName),
    )
  }
  return out
}
