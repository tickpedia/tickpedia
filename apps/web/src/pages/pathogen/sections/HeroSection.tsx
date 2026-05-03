import { Stat } from '../../shared/index.js'
import type { PathogenRow } from '../data/normalize.js'

// Hero band for /pathogens/[slug]. Three columns at desktop:
//   monogram column · headline column · at-a-glance sidebar
// Same shape as pages/disease/sections/HeroSection.tsx — pathogens
// don't have a design crest yet, so a typographic monogram in a
// hairline ring carries the visual weight.

export interface HeroSectionProps {
  pathogen: PathogenRow
  /** Distinct counties where the pathogen has been detected. `null` while loading. */
  totalCounties: number | null
  /** Number of states with at least one detection. */
  stateCount: number | null
  /** Latest year present in the surveillance data. */
  latestYear: number | null
  /** Number of tick species that carry it. `null` while loading. */
  tickCount: number | null
  /** Number of diseases this pathogen causes. `null` while loading. */
  diseaseCount: number | null
}

export function HeroSection({
  pathogen,
  totalCounties,
  stateCount,
  latestYear,
  tickCount,
  diseaseCount,
}: HeroSectionProps) {
  const monogramLetter = (pathogen.displayName.trim()[0] ?? '?').toUpperCase()
  const showScientific =
    pathogen.scientificName.length > 0 &&
    pathogen.scientificName !== pathogen.displayName

  return (
    <div className="tp-hero" data-testid="pathogen-hero">
      <div className="crest" data-testid="pathogen-monogram">
        <Monogram letter={monogramLetter} />
      </div>
      <div>
        <div className="ui eyebrow">Pathogen · taxon</div>
        <h1 className="tp-serif">{pathogen.displayName}</h1>
        {showScientific && (
          <div className="tp-serif scientific">{pathogen.scientificName}</div>
        )}
        {pathogen.oneLiner && <p className="tp-serif lede">{pathogen.oneLiner}</p>}
        <div
          className="ui chips"
          style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}
        >
          {totalCounties !== null && totalCounties > 0 && (
            <span className="tp-chip" title="Distinct counties with at least one detection">
              {totalCounties === 1
                ? 'Detected · 1 county'
                : `Detected · ${totalCounties.toLocaleString()} counties`}
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
          {diseaseCount !== null && diseaseCount > 0 && (
            <a
              className="tp-chip tp-chip-link"
              href="#diseases"
              title="Jump to the diseases it causes"
            >
              {diseaseCount === 1
                ? 'Causes 1 disease'
                : `Causes ${diseaseCount} diseases`}
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
            value={totalCounties === null ? '…' : totalCounties.toLocaleString()}
            label="Counties detected"
            {...(latestYear ? { sub: `latest year · ${latestYear}` } : {})}
          />
          <Stat
            value={stateCount === null ? '…' : String(stateCount)}
            label="States affected"
          />
          <Stat
            value={tickCount === null ? '…' : String(tickCount)}
            label="Tick vectors"
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
