import { TickCrest, type TickArtColors } from '@tickpedia/ui'
import { Stat } from '../../shared/index.js'
import type { TickRow } from '../data/useTick.js'

// Hero band: oversized crest + headline name + scientific name +
// one-liner + chips + at-a-glance Stat sidebar. The chips come from
// the tick row + the per-tick analyses (counties established, diseases
// carried). Caller passes the analyses in so the hero stays
// presentational.

export interface HeroSectionProps {
  tick: TickRow
  /** Total counties this tick is established in. `null` while loading. */
  establishedCounties: number | null
  /** Number of diseases this tick is known to carry. `null` while loading. */
  diseaseCount: number | null
}

export function HeroSection({ tick, establishedCounties, diseaseCount }: HeroSectionProps) {
  const colors: TickArtColors = {
    headColor: tick.heroHeadColor ?? '#3a2a1a',
    bodyColor: tick.heroBodyColor ?? '#7a4a2a',
    legColor: tick.heroLegColor ?? '#1c1814',
  }

  return (
    <div
      style={{
        padding: '20px 32px 28px',
        display: 'grid',
        gridTemplateColumns: '240px 1fr 240px',
        gap: 36,
        alignItems: 'start',
      }}
    >
      <div>
        <TickCrest
          size="hero"
          colors={colors}
          common={tick.commonName}
          scientific={tick.scientificName}
        />
      </div>
      <div>
        <div className="ui eyebrow">Ixodidae · hard tick</div>
        <h1
          className="tp-serif"
          style={{
            fontSize: 56,
            lineHeight: 1.02,
            letterSpacing: '-0.025em',
            margin: '10px 0 6px',
          }}
        >
          {tick.commonName}
        </h1>
        <div
          className="tp-serif"
          style={{
            fontSize: 22,
            fontStyle: 'italic',
            color: 'var(--muted)',
            marginBottom: 18,
          }}
        >
          {tick.scientificName}
        </div>
        {tick.oneLiner && (
          <p
            className="tp-serif"
            style={{
              fontSize: 19,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              maxWidth: 560,
            }}
          >
            {tick.oneLiner}
          </p>
        )}
        <div
          className="ui"
          style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}
        >
          <span className={`tp-chip danger-${tick.dangerLevel}`}>
            {dangerLabel(tick.dangerLevel)}
          </span>
          {diseaseCount !== null && (
            <span className="tp-chip">
              {diseaseCount === 1 ? 'Carries 1 disease' : `Carries ${diseaseCount} diseases`}
            </span>
          )}
          {establishedCounties !== null && establishedCounties > 0 && (
            <span className="tp-chip">
              Established · {establishedCounties.toLocaleString()} counties
            </span>
          )}
        </div>
      </div>

      <aside className="hairline" style={{ padding: 16, background: 'var(--surface)' }}>
        <div className="ui eyebrow" style={{ marginBottom: 10 }}>
          At a glance
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <Stat
            value={establishedCounties === null ? '…' : establishedCounties.toLocaleString()}
            label="Counties established"
            sub="of 3 146"
          />
          <Stat
            value={diseaseCount === null ? '…' : String(diseaseCount)}
            label="Diseases carried"
          />
          <Stat value={dangerLabel(tick.dangerLevel)} label="Danger level" />
        </div>
      </aside>
    </div>
  )
}

function dangerLabel(level: 'low' | 'medium' | 'high'): string {
  if (level === 'high') return 'High danger'
  if (level === 'medium') return 'Moderate'
  return 'Low danger'
}
