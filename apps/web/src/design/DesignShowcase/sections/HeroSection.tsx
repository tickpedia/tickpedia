import { Wordmark } from '@tickpedia/ui'

// Top-of-showcase: brand hero. Sets the design's voice in the first
// 200vh — serif of consequence, paper background, brick accent.

export function HeroSection() {
  return (
    <section>
      <div className="ui eyebrow" style={{ marginBottom: 8 }}>
        Phase 01 — design tokens & brand primitives
      </div>
      <h1
        className="tp-serif"
        style={{
          fontSize: 48,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          margin: '0 0 18px',
        }}
      >
        An encyclopedia
        <br />
        that earns its data.
      </h1>
      <Wordmark size={36} />
      <p
        className="tp-serif"
        style={{
          fontSize: 17,
          color: 'var(--ink-2)',
          maxWidth: 620,
          lineHeight: 1.55,
          marginTop: 18,
        }}
      >
        Tickpedia reads like a field bulletin and behaves like a citation engine.
        The visual system is paper-first: warm neutrals, hairline rules, a serif
        of consequence, and one editorial brick for accent. The tick is rendered
        as a heraldic crest from its editorial head/body/leg colors — never a
        photograph.
      </p>
    </section>
  )
}
