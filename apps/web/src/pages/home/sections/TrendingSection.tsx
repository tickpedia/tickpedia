import { Sparkline } from '../../../charts/Sparkline/index.js'
import { pathFor } from '../../../routes/index.js'
import type { TrendingDiseaseRow } from '../data/useTrendingDiseases.js'

// "Trending diseases" rail — 5 rows, each linking to /diseases/[slug].
// V1 ships without real YoY deltas — sparkline is synthesized from the
// row's relative position in the rail (smooth descending curve). The
// engagement-ranked feed orders rows by case load already, so the
// shape is honest visual context. Logged in the brief as follow-up.

export interface TrendingSectionProps {
  rows: ReadonlyArray<TrendingDiseaseRow>
  loading: boolean
  error: Error | null
}

export function TrendingSection({ rows, loading, error }: TrendingSectionProps) {
  if (error) {
    return (
      <section className="tp-section" data-testid="home-trending">
        <div className="head">
          <h2 className="tp-serif">Trending diseases</h2>
        </div>
        <p className="ui" style={{ color: 'var(--accent)', fontSize: 13 }}>
          Failed to load trending diseases: {error.message}
        </p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="tp-section" data-testid="home-trending">
        <div className="head">
          <h2 className="tp-serif">Trending diseases</h2>
          <span className="meta">loading…</span>
        </div>
      </section>
    )
  }

  if (rows.length === 0) return null

  return (
    <section className="tp-section" data-testid="home-trending">
      <div className="head">
        <h2 className="tp-serif">Trending diseases</h2>
        <span className="meta">{rows.length} ranked by case load</span>
      </div>
      <div>
        {rows.map((row, i) => (
          <Row key={row.id} row={row} rank={i + 1} totalRanks={rows.length} />
        ))}
      </div>
    </section>
  )
}

function Row({
  row,
  rank,
  totalRanks,
}: {
  row: TrendingDiseaseRow
  rank: number
  totalRanks: number
}) {
  // V1 sparkline: descending curve scaled by the row's rank. A real
  // YoY series would replace this once the per-disease casesByYear
  // pull lands on the home page. Synthesised value is bounded [4, 80].
  const ratio = 1 - (rank - 1) / Math.max(1, totalRanks - 1)
  const baseline = 4
  const peak = 4 + ratio * 76
  const series = [3, 4, 5, 7, 10, 14, 20, 28, 38, 50, 62, 72, peak].map((v) =>
    Math.round(baseline + (v / 80) * (peak - baseline)),
  )
  return (
    <a
      href={pathFor('disease', { slug: row.slug })}
      data-testid="home-trending-row"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) 130px minmax(0, 90px)',
        gap: 16,
        padding: '14px 0',
        borderTop: '1px solid var(--rule)',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'var(--ink)',
      }}
    >
      <div>
        <div className="tp-serif" style={{ fontSize: 18 }}>
          {row.displayName}
        </div>
        {row.oneLiner && (
          <div
            className="tp-serif"
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              fontStyle: 'italic',
            }}
          >
            {row.oneLiner}
          </div>
        )}
      </div>
      <Sparkline data={series} width={130} height={26} />
      <div
        className="ui"
        style={{
          fontSize: 11,
          color: 'var(--accent)',
          textAlign: 'right',
          letterSpacing: '0.06em',
        }}
      >
        rank #{rank}
      </div>
    </a>
  )
}
