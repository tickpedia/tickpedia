import { LineChart } from '../../../charts/index.js'
import type { PathogenSpreadData } from '../data/usePathogenSpread.js'

// Year-over-year detection-spread chart for /pathogens/[slug]/range.
// Cumulative county count by year — same shape as the tick page's
// "spread over time" panel. Falls back to a single-year sentence if
// only one year has rows.

export interface SpreadSectionProps {
  pathogenName: string
  data: PathogenSpreadData | null
  loading: boolean
  error: Error | null
}

export function SpreadSection({ pathogenName, data, loading, error }: SpreadSectionProps) {
  return (
    <section className="tp-section" data-testid="pathogen-spread">
      <div className="head">
        <h2 className="tp-serif">Spread over time</h2>
        <span className="meta">cumulative counties detected</span>
      </div>

      {error && <ErrorMessage message={error.message} />}

      {!error && (!data || data.rows.length === 0) && (
        <p className="tp-serif" style={{ fontSize: 14, color: 'var(--muted)' }}>
          {loading ? 'Loading…' : `Year-over-year spread not yet imported for ${pathogenName}.`}
        </p>
      )}

      {!error && data && data.rows.length === 1 && (
        <SinglePoint pathogenName={pathogenName} only={data.rows[0]!} />
      )}

      {!error && data && data.rows.length >= 2 && (
        <LineChart
          data={data.rows.map((r) => r.counties)}
          years={data.rows.map((r) => r.year)}
          width={760}
          height={280}
          label="Cumulative counties · per year"
          ariaLabel={`${pathogenName} county detection spread`}
        />
      )}
    </section>
  )
}

function SinglePoint({
  pathogenName,
  only,
}: {
  pathogenName: string
  only: { year: number; counties: number }
}) {
  return (
    <p className="tp-serif" style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 640 }}>
      Detected in {only.counties.toLocaleString()} {only.counties === 1 ? 'county' : 'counties'} as of {only.year} — the only year on file for {pathogenName}. Once prior surveillance drops land, this chart will show year-over-year spread.
    </p>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      className="ui"
      style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--mono)' }}
    >
      Failed to load spread data: {message}
    </p>
  )
}
