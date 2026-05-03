import type { TechniqueRow, TechniqueKind } from '../data/useTechnique.js'
import type { TechniqueTickRow } from '../data/useTechniqueTicks.js'
import { pathFor } from '../../../routes/index.js'

// Hero band for /techniques/[slug]. Three blocks:
//   1. Title column with kind eyebrow + (for myth kind) a hard warning banner.
//   2. Monogram crest.
//   3. "Applies to" tick chips + (for prevention kind) a 0-10 score scale +
//      (for any kind) a citations bibliography.

export interface HeroSectionProps {
  technique: TechniqueRow
  tickRows: readonly TechniqueTickRow[]
  /** True while the tick rail is still resolving — chips show `…`. */
  ticksLoading: boolean
}

const KIND_EYEBROW: Record<TechniqueKind, string> = {
  removal: 'Removal · field guidance',
  prevention: 'Prevention · field guidance',
  aftercare: 'After-bite guidance',
  diagnostic: 'Diagnostic · lab path',
  myth: 'Debunked · do not use',
}

export function HeroSection({ technique, tickRows, ticksLoading }: HeroSectionProps) {
  const monogramLetter = (technique.title.trim()[0] ?? '?').toUpperCase()
  const eyebrow = KIND_EYEBROW[technique.kind]
  const isMyth = technique.kind === 'myth'
  const isPrevention = technique.kind === 'prevention'

  return (
    <div className="tp-tech-hero" data-testid="technique-hero">
      <div>
        <div
          className="ui eyebrow"
          data-testid="technique-eyebrow"
          data-kind={technique.kind}
          style={isMyth ? { color: 'var(--accent)' } : undefined}
        >
          {eyebrow}
        </div>
        <h1 className="tp-serif">{technique.title}</h1>
        {technique.oneLiner && <p className="tp-serif lede">{technique.oneLiner}</p>}

        {isMyth && (
          <div
            className="hairline"
            data-testid="technique-myth-banner"
            role="alert"
            style={{
              marginTop: 14,
              padding: '12px 14px',
              background: 'rgba(196, 28, 30, 0.06)',
              borderColor: 'var(--accent)',
              borderRadius: 6,
            }}
          >
            <div
              className="ui eyebrow"
              style={{ color: 'var(--accent)', marginBottom: 4 }}
            >
              Do not use
            </div>
            <p
              className="tp-serif"
              style={{ fontSize: 14, lineHeight: 1.5, margin: 0, color: 'var(--ink)' }}
            >
              CDC and the tick-borne disease literature warn against this. The
              steps below explain why and what to do instead.
            </p>
          </div>
        )}

        {isPrevention && technique.preventionScore !== null && (
          <PreventionScoreScale score={technique.preventionScore} />
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

        {technique.citations.length > 0 && (
          <CitationsBlock citations={technique.citations} />
        )}
      </aside>
    </div>
  )
}

function CitationsBlock({ citations }: { citations: readonly string[] }) {
  return (
    <div data-testid="technique-citations" style={{ marginTop: 18 }}>
      <div className="ui eyebrow" style={{ marginBottom: 8 }}>
        Sources
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {citations.map((url) => (
          <li key={url}>
            <a
              className="tp-chip tp-chip-link"
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              title={url}
              style={{ display: 'inline-block', maxWidth: '100%' }}
            >
              {hostnameFor(url)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PreventionScoreScale({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(10, score))
  const label =
    clamped >= 8
      ? 'High impact'
      : clamped >= 5
        ? 'Moderate impact'
        : clamped >= 2
          ? 'Low impact'
          : 'Marginal'
  return (
    <div
      data-testid="technique-prevention-score"
      data-score={clamped}
      style={{ marginTop: 18 }}
    >
      <div className="ui eyebrow" style={{ marginBottom: 6 }}>
        Prevention impact · {label}
      </div>
      <div
        role="img"
        aria-label={`Prevention impact ${clamped} out of 10`}
        style={{
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            data-testid={`pscore-segment-${i + 1}`}
            data-active={i < clamped ? 'on' : 'off'}
            style={{
              width: 18,
              height: 8,
              borderRadius: 2,
              background:
                i < clamped ? 'var(--accent)' : 'var(--rule)',
            }}
          />
        ))}
        <span
          className="mono"
          style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }}
        >
          {clamped} / 10
        </span>
      </div>
    </div>
  )
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
