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
    <div className="tp-hero" data-testid="tick-hero">
      <div className="crest">
        <TickCrest
          size="hero"
          colors={colors}
          common={tick.commonName}
          scientific={tick.scientificName}
        />
      </div>
      <div>
        <div className="ui eyebrow">Ixodidae · hard tick</div>
        <h1 className="tp-serif">{tick.commonName}</h1>
        <div className="tp-serif scientific">{tick.scientificName}</div>
        {tick.oneLiner && (
          <p className="tp-serif lede">{tick.oneLiner}</p>
        )}
        <div
          className="ui chips"
          style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}
        >
          <span
            className={`tp-chip danger-${tick.dangerLevel}`}
            title={dangerExplainer(tick.dangerLevel)}
          >
            {dangerLabel(tick.dangerLevel)}
          </span>
          {diseaseCount !== null && diseaseCount > 0 && (
            <a
              className="tp-chip tp-chip-link"
              href="#diseases"
              title="Jump to the diseases this tick carries"
            >
              {diseaseCount === 1 ? 'Carries 1 disease' : `Carries ${diseaseCount} diseases`}
            </a>
          )}
          {establishedCounties !== null && establishedCounties > 0 && (
            <a
              className="tp-chip tp-chip-link"
              href="#range"
              title="Jump to the established range map"
            >
              Established · {establishedCounties.toLocaleString()} counties
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

function dangerExplainer(level: 'low' | 'medium' | 'high'): string {
  if (level === 'high') {
    return 'High danger — primary vector for one or more serious illnesses; bite risk is elevated where established.'
  }
  if (level === 'medium') {
    return 'Moderate — known disease vector but bite rates and prevalence vary by region.'
  }
  return 'Low danger — limited disease transmission risk; rarely bites humans.'
}
