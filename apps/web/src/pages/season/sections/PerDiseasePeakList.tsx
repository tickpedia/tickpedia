import { pathFor } from '../../../routes/index.js'
import type { SeasonalityData } from '../data/aggregate.js'

const MONTH_NAMES: ReadonlyArray<string> = [
  '—', // 0 = no data
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface DiseaseRef {
  id: number
  slug: string
  displayName: string
}

export interface PerDiseasePeakListProps {
  rows: SeasonalityData['perDisease']
  diseases: ReadonlyArray<DiseaseRef>
  loading: boolean
}

export function PerDiseasePeakList({
  rows,
  diseases,
  loading,
}: PerDiseasePeakListProps) {
  const byId = new Map(diseases.map((d) => [d.id, d]))

  const enriched = rows
    .map((r) => {
      const d = byId.get(r.diseaseId)
      if (!d) return null
      return { ...r, slug: d.slug, displayName: d.displayName }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.total - a.total)

  if (loading) {
    return (
      <section className="tp-section" data-testid="season-per-disease">
        <div className="head">
          <h2 className="tp-serif">Peaks by disease</h2>
          <span className="meta">loading…</span>
        </div>
      </section>
    )
  }

  if (enriched.length === 0) {
    return (
      <section className="tp-section" data-testid="season-per-disease">
        <div className="head">
          <h2 className="tp-serif">Peaks by disease</h2>
        </div>
        <p className="ui" style={{ color: 'var(--ink-2)', fontSize: 14 }}>
          Monthly data not yet imported.
        </p>
      </section>
    )
  }

  return (
    <section className="tp-section" data-testid="season-per-disease">
      <div className="head">
        <h2 className="tp-serif">Peaks by disease</h2>
        <span className="meta">{enriched.length} reportable</span>
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 6,
        }}
      >
        {enriched.map((row) => (
          <li key={row.diseaseId}>
            <a
              href={pathFor('disease', { slug: row.slug })}
              className="hairline ui"
              style={{
                padding: '10px 14px',
                color: 'var(--ink)',
                textDecoration: 'none',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                borderRadius: 6,
              }}
            >
              <span className="tp-serif" style={{ fontSize: 15 }}>
                {row.displayName}
              </span>
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--muted)' }}
              >
                peaks {MONTH_NAMES[row.peakMonth] ?? '—'}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
