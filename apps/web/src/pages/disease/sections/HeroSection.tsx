import { Stat } from '../../shared/index.js'
import { pathFor } from '../../../routes/index.js'
import type { DiseaseRow } from '../data/useDisease.js'
import type { PeakInfo } from '../data/useDiseaseSeasonality.js'

// Hero band for /diseases/[slug]. Three columns at desktop:
//   crest column · headline column · at-a-glance sidebar
// Mirrors pages/tick/sections/HeroSection.tsx, but the crest is a
// typographic monogram rather than a TickCrest variant — disease
// crests aren't in the design pass yet.

export interface HeroSectionProps {
  disease: DiseaseRow
  /** Total CDC-reported cases. `null` while loading. */
  totalCases: number | null
  /** Number of distinct states with at least one case. `null` while loading. */
  stateCount: number | null
  /** Top state name (display form) or null if none. */
  topStateName: string | null
  /** Latest year present in the history series. */
  latestYear: number | null
  /** Peak month info from the seasonality series. */
  peak: PeakInfo
  /** Number of tick species that carry this disease. `null` while loading. */
  tickCount: number | null
}

export function HeroSection({
  disease,
  totalCases,
  stateCount,
  topStateName,
  latestYear,
  peak,
  tickCount,
}: HeroSectionProps) {
  const monogramLetter = (disease.displayName.trim()[0] ?? '?').toUpperCase()
  const riskPath = pathFor('risk-disease', { slug: disease.slug })

  return (
    <div className="tp-hero" data-testid="disease-hero">
      <div className="crest" data-testid="disease-monogram">
        <Monogram letter={monogramLetter} />
      </div>
      <div>
        <div className="ui eyebrow">Tick-borne illness</div>
        <h1 className="tp-serif">{disease.displayName}</h1>
        {disease.oneLiner && <p className="tp-serif lede">{disease.oneLiner}</p>}
        <div
          className="ui chips"
          style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}
        >
          {totalCases !== null && totalCases > 0 && (
            <span className="tp-chip" title="Total CDC-reported cases">
              Cases · {totalCases.toLocaleString()}
            </span>
          )}
          {tickCount !== null && tickCount > 0 && (
            <a
              className="tp-chip tp-chip-link"
              href="#ticks"
              title="Jump to the ticks that carry it"
            >
              {tickCount === 1
                ? 'Carried by 1 tick'
                : `Carried by ${tickCount} ticks`}
            </a>
          )}
          {peak.monthName && (
            <a
              className="tp-chip tp-chip-link"
              href="#seasonality"
              title="Jump to the seasonality chart"
            >
              Peak · {peak.monthName}
            </a>
          )}
          <a
            className="tp-chip tp-chip-link"
            href={riskPath}
            title="Open the H3 hexagon risk map filtered to this disease"
          >
            View risk map →
          </a>
        </div>
      </div>

      <aside className="hairline at-a-glance">
        <div className="ui eyebrow" style={{ marginBottom: 10 }}>
          At a glance
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <Stat
            value={totalCases === null ? '…' : totalCases.toLocaleString()}
            label="Total cases"
            {...(latestYear ? { sub: `latest year · ${latestYear}` } : {})}
          />
          <Stat
            value={stateCount === null ? '…' : String(stateCount)}
            label="States affected"
            {...(topStateName ? { sub: `top · ${topStateName}` } : {})}
          />
          <Stat
            value={peak.monthName ?? '—'}
            label="Peak month"
            {...(peak.monthName ? {} : { sub: 'no clear seasonality' })}
          />
        </div>
      </aside>
    </div>
  )
}

function Monogram({ letter }: { letter: string }) {
  return (
    <div
      className="hairline"
      aria-hidden="true"
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        maxWidth: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        borderRadius: 999,
      }}
    >
      <span
        className="tp-serif"
        style={{
          fontSize: 'clamp(72px, 14vw, 112px)',
          lineHeight: 1,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
        }}
      >
        {letter}
      </span>
    </div>
  )
}
