import { Stat } from '../../shared/index.js'
import { pathFor } from '../../../routes/index.js'
import type { StateRow } from '../data/useStateRow.js'
import type { StateDiseaseRow } from '../data/useStateDiseases.js'

// Hero band for /states/[slug]. Three columns at desktop:
//   monogram column · headline column · at-a-glance sidebar
// Mirrors the disease hero. The H3 sidebar shown in the design is a
// phase-10 artefact — skipped here, logged in phase_7 brief follow-ups.

export interface HeroSectionProps {
  state: StateRow
  countyCount: number | null
  tickCount: number | null
  topDisease: Pick<StateDiseaseRow, 'slug' | 'displayName' | 'total'> | null
}

export function HeroSection({ state, countyCount, tickCount, topDisease }: HeroSectionProps) {
  const monogramLetter = (state.code || state.name)[0]?.toUpperCase() ?? '?'

  return (
    <div className="tp-hero" data-testid="state-hero">
      <div className="crest" data-testid="state-monogram">
        <Monogram letter={monogramLetter} />
      </div>
      <div>
        <div className="ui eyebrow">
          FIPS {state.fips} · USPS {state.code}
          {countyCount !== null && countyCount > 0 ? ` · ${countyCount} counties` : ''}
        </div>
        <h1 className="tp-serif">{state.name}</h1>
        <p className="tp-serif lede">
          Tick species established in {state.name}, CDC-reported disease cases by county,
          and the county-level breakdown of where ticks and pathogens concentrate.
        </p>
        <div
          className="ui chips"
          style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}
        >
          {tickCount !== null && tickCount > 0 && (
            <a
              className="tp-chip tp-chip-link"
              href="#ticks"
              title="Jump to the ticks established in this state"
            >
              {tickCount === 1
                ? 'Established · 1 tick'
                : `Established · ${tickCount} ticks`}
            </a>
          )}
          {topDisease && topDisease.total > 0 && (
            <a
              className="tp-chip tp-chip-link"
              href={pathFor('disease', { slug: topDisease.slug })}
              title={`Most-reported disease in ${state.name}`}
            >
              Top disease · {topDisease.displayName} ({topDisease.total.toLocaleString()})
            </a>
          )}
          {countyCount !== null && countyCount > 0 && (
            <a
              className="tp-chip tp-chip-link"
              href={pathFor('state-counties', { slug: state.slug })}
              title="See every county in this state"
            >
              Counties · {countyCount}
            </a>
          )}
        </div>
      </div>

      <aside className="hairline at-a-glance">
        <div className="ui eyebrow" style={{ marginBottom: 10 }}>
          At a glance
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <Stat
            value={tickCount === null ? '…' : String(tickCount)}
            label="Established ticks"
          />
          <Stat
            value={topDisease ? topDisease.total.toLocaleString() : '…'}
            label={topDisease ? `${topDisease.displayName} cases` : 'Top disease cases'}
            {...(topDisease ? { sub: 'cumulative · all years' } : {})}
          />
          <Stat
            value={countyCount === null ? '…' : String(countyCount)}
            label="Counties"
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
