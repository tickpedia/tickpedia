import type { FactRow } from '../data/useFact.js'
import type { FactRefs } from '../data/useFactRefs.js'
import { titleizeSlug, citationHostname } from '../data/slug-title.js'
import { pathFor } from '../../../routes/index.js'

// Hero band for /facts/[slug]. Two columns at desktop:
// body column on the left, refs sidebar on the right (ticks +
// diseases + techniques chip groups). Reuses `.tp-tech-hero` from
// phase 6 — same shape, no numeric stat sidebar.

export interface HeroSectionProps {
  fact: FactRow
  refs: FactRefs
  refsLoading: boolean
}

export function HeroSection({ fact, refs, refsLoading }: HeroSectionProps) {
  const headline = titleizeSlug(fact.slug)
  const monogramLetter = (fact.slug.trim()[0] ?? '?').toUpperCase()
  const paragraphs = splitParagraphs(fact.body)
  const citationLabel = fact.citationUrl ? citationHostname(fact.citationUrl) : null

  return (
    <div className="tp-tech-hero" data-testid="fact-hero">
      <div>
        <div className="ui eyebrow">Wild fact</div>
        <h1 className="tp-serif">{headline}</h1>
        {paragraphs.map((para, i) => (
          <p key={i} className="tp-serif lede">
            {para}
          </p>
        ))}
        {fact.citationUrl && citationLabel && (
          <div className="ui chips" style={{ marginTop: 14 }}>
            <a
              className="tp-chip tp-chip-link"
              href={fact.citationUrl}
              target="_blank"
              rel="noreferrer noopener"
              title={`External source: ${fact.citationUrl}`}
              data-testid="fact-citation"
            >
              Source · {citationLabel}
            </a>
          </div>
        )}
      </div>

      <div className="crest" data-testid="fact-monogram" aria-hidden="true">
        <Monogram letter={monogramLetter} />
      </div>

      <aside className="hairline applies-to" data-testid="fact-refs">
        <div className="ui eyebrow" style={{ marginBottom: 10 }}>
          References
        </div>
        {refsLoading && <span className="ui meta">…</span>}
        {!refsLoading && (
          <RefGroups refs={refs} />
        )}
      </aside>
    </div>
  )
}

function RefGroups({ refs }: { refs: FactRefs }) {
  const total = refs.ticks.length + refs.diseases.length + refs.techniques.length
  if (total === 0) {
    return (
      <p
        className="tp-serif"
        style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}
      >
        No entity references yet — editorial mapping will populate as the
        fact body is reviewed.
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {refs.ticks.length > 0 && (
        <RefGroup
          label={`Ticks · ${refs.ticks.length}`}
          chips={refs.ticks.map((t) => ({
            href: pathFor('tick', { slug: t.slug }),
            label: t.commonName,
            title: t.scientificName,
          }))}
          testid="fact-refs-ticks"
        />
      )}
      {refs.diseases.length > 0 && (
        <RefGroup
          label={`Diseases · ${refs.diseases.length}`}
          chips={refs.diseases.map((d) => ({
            href: pathFor('disease', { slug: d.slug }),
            label: d.displayName,
            title: d.oneLiner ?? undefined,
          }))}
          testid="fact-refs-diseases"
        />
      )}
      {refs.techniques.length > 0 && (
        <RefGroup
          label={`Techniques · ${refs.techniques.length}`}
          chips={refs.techniques.map((tq) => ({
            href: pathFor('technique', { slug: tq.slug }),
            label: tq.title,
            title: tq.oneLiner ?? undefined,
          }))}
          testid="fact-refs-techniques"
        />
      )}
    </div>
  )
}

interface ChipSpec {
  href: string
  label: string
  title?: string | undefined
}

function RefGroup({
  label,
  chips,
  testid,
}: {
  label: string
  chips: ReadonlyArray<ChipSpec>
  testid: string
}) {
  return (
    <div data-testid={testid}>
      <div
        className="mono"
        style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chips.map((c, i) => (
          <a
            key={`${c.href}-${i}`}
            href={c.href}
            className="tp-chip tp-chip-link"
            {...(c.title ? { title: c.title } : {})}
          >
            {c.label}
          </a>
        ))}
      </div>
    </div>
  )
}

function splitParagraphs(body: string): string[] {
  const trimmed = (body ?? '').trim()
  if (!trimmed) return []
  return trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
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
