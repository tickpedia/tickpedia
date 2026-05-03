import { Stat } from '../../shared/index.js'
import { pathFor } from '../../../routes/index.js'
import type { CountyRow, ParentState } from '../data/useCounty.js'
import type { CountyDiseaseRow } from '../data/useCountyDiseases.js'
import type { CountyNeighbourRow } from '../data/useCountyNeighbours.js'
import { formatCountyName } from '../data/county-name.js'

// Hero band for /counties/[state]/[slug]. Two columns at desktop:
//   headline column · neighbours sidebar
// Centroid coordinates fit naturally into the eyebrow line.

export interface HeroSectionProps {
  county: CountyRow
  parentState: ParentState
  totalCases: number | null
  tickCount: number | null
  topDisease: Pick<CountyDiseaseRow, 'slug' | 'displayName' | 'total' | 'latestYear'> | null
  neighbours: readonly CountyNeighbourRow[]
  neighboursLoading: boolean
}

export function HeroSection({
  county,
  parentState,
  totalCases,
  tickCount,
  topDisease,
  neighbours,
  neighboursLoading,
}: HeroSectionProps) {
  const displayName = formatCountyName(county.countyName)
  const eyebrow = buildEyebrow(county)
  const lede = buildLede(county, parentState, topDisease)

  return (
    <div className="tp-county-hero" data-testid="county-hero">
      <div>
        <div className="ui eyebrow">{eyebrow}</div>
        <h1 className="tp-serif">{displayName}</h1>
        <div
          className="tp-serif"
          style={{ fontSize: 18, color: 'var(--muted)', marginBottom: 18 }}
        >
          <a
            href={pathFor('state', { slug: parentState.slug })}
            style={{ color: 'inherit' }}
          >
            {parentState.name}
          </a>
        </div>
        <p className="tp-serif lede">{lede}</p>
        <div
          className="ui chips"
          style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}
        >
          {totalCases !== null && totalCases > 0 && (
            <a className="tp-chip tp-chip-link" href="#diseases" title="Jump to the disease totals">
              Cases · {totalCases.toLocaleString()}
            </a>
          )}
          {tickCount !== null && tickCount > 0 && (
            <a className="tp-chip tp-chip-link" href="#ticks" title="Jump to the ticks reported here">
              {tickCount === 1
                ? 'Established · 1 tick'
                : `Established · ${tickCount} ticks`}
            </a>
          )}
          {topDisease && topDisease.total > 0 && (
            <a
              className="tp-chip tp-chip-link"
              href={pathFor('disease', { slug: topDisease.slug })}
              title={`Most-reported disease in ${displayName}`}
            >
              Top disease · {topDisease.displayName}
            </a>
          )}
        </div>

        <div className="ui" style={{ display: 'flex', gap: 16, marginTop: 22, flexWrap: 'wrap' }}>
          <Stat
            value={totalCases === null ? '…' : totalCases.toLocaleString()}
            label="Total cases"
            {...(topDisease?.latestYear ? { sub: `latest year · ${topDisease.latestYear}` } : {})}
          />
          <Stat
            value={tickCount === null ? '…' : String(tickCount)}
            label="Tick species reported"
          />
          <Stat
            value={topDisease ? topDisease.displayName : '…'}
            label="Top disease"
            {...(topDisease ? { sub: `${topDisease.total.toLocaleString()} cases` } : {})}
          />
        </div>
      </div>

      <aside
        className="hairline"
        data-testid="county-neighbours"
        style={{ padding: 14, background: 'var(--surface)' }}
      >
        <div className="ui eyebrow" style={{ marginBottom: 8 }}>
          Neighbouring counties · ≤ 6 closest
        </div>
        {neighboursLoading && <span className="ui meta">…</span>}
        {!neighboursLoading && neighbours.length === 0 && (
          <p className="tp-serif" style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            No nearby counties found.
          </p>
        )}
        {!neighboursLoading && neighbours.length > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            {neighbours.map((n) => {
              const href = n.stateSlug
                ? pathFor('county', { state: n.stateSlug, slug: n.slug })
                : null
              const label = `${n.countyName}${n.stateCode ? `, ${n.stateCode}` : ''}`
              return href ? (
                <a
                  key={n.fips}
                  href={href}
                  className="ui"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    borderBottom: '1px dotted var(--rule)',
                    color: 'var(--ink)',
                    textDecoration: 'none',
                    fontSize: 13,
                  }}
                  title={`${formatCountyName(n.countyName)} — ${Math.round(n.distanceKm)} km`}
                >
                  <span>{label}</span>
                  <span className="mono" style={{ color: 'var(--muted)' }}>
                    {Math.round(n.distanceKm)} km
                  </span>
                </a>
              ) : (
                <div
                  key={n.fips}
                  className="ui"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    borderBottom: '1px dotted var(--rule)',
                    color: 'var(--muted)',
                    fontSize: 13,
                  }}
                >
                  <span>{label}</span>
                  <span className="mono">{Math.round(n.distanceKm)} km</span>
                </div>
              )
            })}
          </div>
        )}
        <div className="ui" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 10 }}>
          By lat/lng proximity, not state border.
        </div>
      </aside>
    </div>
  )
}

function buildEyebrow(county: CountyRow): string {
  const parts = [`FIPS ${county.fips}`]
  if (county.latitude !== null && county.longitude !== null) {
    const ns = county.latitude >= 0 ? 'N' : 'S'
    const ew = county.longitude >= 0 ? 'E' : 'W'
    parts.push(
      `${Math.abs(county.latitude).toFixed(2)}° ${ns}, ${Math.abs(county.longitude).toFixed(2)}° ${ew}`,
    )
    parts.push('Census centroid')
  }
  return parts.join(' · ')
}

function buildLede(
  county: CountyRow,
  parentState: ParentState,
  topDisease: Pick<CountyDiseaseRow, 'displayName' | 'total' | 'latestYear'> | null,
): string {
  const displayName = formatCountyName(county.countyName)
  if (topDisease && topDisease.total > 0) {
    const latest = topDisease.latestYear || 'recent years'
    return `${displayName} reported ${topDisease.total.toLocaleString()} cumulative ${topDisease.displayName} cases through ${latest}.`
  }
  return `Tick surveillance and CDC-reported disease counts for ${displayName}, ${parentState.name}.`
}

