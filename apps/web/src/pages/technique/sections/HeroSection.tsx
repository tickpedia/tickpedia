import type { TechniqueRow } from '../data/useTechnique.js'
import type { TechniqueTickRow } from '../data/useTechniqueTicks.js'
import { pathFor } from '../../../routes/index.js'

// Hero band for /techniques/[slug]. Two columns at desktop:
// headline column on the left, "Applies to" tick chip rail on the
// right. No "at-a-glance" stat sidebar — techniques don't have
// numeric stats.
//
// The crest is a typographic monogram (first letter of the title in
// the serif face, hairline ring) — same shape as the disease hero.

export interface HeroSectionProps {
  technique: TechniqueRow
  tickRows: readonly TechniqueTickRow[]
  /** True while the tick rail is still resolving — chips show `…`. */
  ticksLoading: boolean
}

export function HeroSection({ technique, tickRows, ticksLoading }: HeroSectionProps) {
  const monogramLetter = (technique.title.trim()[0] ?? '?').toUpperCase()
  const eyebrow = pickEyebrow(technique.slug)
  const showSourceChip = Boolean(technique.sourceUrl)

  return (
    <div className="tp-tech-hero" data-testid="technique-hero">
      <div>
        <div className="ui eyebrow">{eyebrow}</div>
        <h1 className="tp-serif">{technique.title}</h1>
        {technique.oneLiner && <p className="tp-serif lede">{technique.oneLiner}</p>}
        {showSourceChip && technique.sourceUrl && (
          <div className="ui chips" style={{ marginTop: 14 }}>
            <a
              className="tp-chip tp-chip-link"
              href={technique.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              title={`External source: ${technique.sourceUrl}`}
            >
              Source · {hostnameFor(technique.sourceUrl)}
            </a>
          </div>
        )}
      </div>

      <div className="crest" data-testid="technique-monogram" aria-hidden="true">
        <Monogram letter={monogramLetter} />
      </div>

      <aside className="hairline applies-to" data-testid="technique-applies-to">
        <div className="ui eyebrow" style={{ marginBottom: 10 }}>
          Applies to
        </div>
        {ticksLoading && <span className="ui meta">…</span>}
        {!ticksLoading && tickRows.length === 0 && (
          <p
            className="tp-serif"
            style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}
          >
            Applies broadly across hard-tick species — editorial mapping
            not yet seeded.
          </p>
        )}
        {!ticksLoading && tickRows.length > 0 && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tickRows.map((row) => (
                <a
                  key={row.id}
                  href={pathFor('tick', { slug: row.slug })}
                  className="tp-chip tp-chip-link"
                  title={row.scientificName}
                >
                  {row.commonName}
                </a>
              ))}
            </div>
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--muted)', marginTop: 10 }}
            >
              {tickRows.length} {tickRows.length === 1 ? 'tick' : 'ticks'} ·
              tick_removal_techniques
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function pickEyebrow(slug: string): string {
  if (slug === 'fine-tipped-tweezers') return 'Removal · primary method'
  if (slug.startsWith('when-')) return 'Field guidance'
  if (slug.startsWith('permethrin')) return 'Prevention · clothing treatment'
  if (slug.includes('tick-tubes')) return 'Prevention · environmental'
  if (slug.includes('saving-the-tick')) return 'After-bite guidance'
  return 'Field guidance'
}

function hostnameFor(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return 'source'
  }
}

function Monogram({ letter }: { letter: string }) {
  return (
    <div
      className="hairline"
      aria-hidden="true"
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        maxWidth: 200,
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
          fontSize: 'clamp(60px, 11vw, 96px)',
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
