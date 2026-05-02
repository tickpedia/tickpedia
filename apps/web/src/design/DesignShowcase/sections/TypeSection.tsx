// Type scale: hero / H2 / body for the serif, plus UI sans + numeric
// mono. Body uses a drop-cap to demonstrate the editorial paragraph.

export function TypeSection() {
  return (
    <section style={{ marginTop: 56 }}>
      <div className="ui eyebrow" style={{ marginBottom: 14 }}>
        Type · Newsreader / Geist / JetBrains Mono
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, maxWidth: 960 }}>
        <div>
          <Caption>Hero · Newsreader 56 / 1.05</Caption>
          <div
            className="tp-serif"
            style={{ fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 24 }}
          >
            The deer tick is moving north.
          </div>

          <Caption>H2 · Newsreader 28 / 1.2</Caption>
          <div className="tp-serif" style={{ fontSize: 28, lineHeight: 1.2, marginBottom: 24 }}>
            Where blacklegged ticks are established
          </div>

          <Caption>Body · Newsreader 17 / 1.55</Caption>
          <p
            className="tp-serif"
            style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 520, margin: 0 }}
          >
            Nymphal blacklegged ticks transmit{' '}
            <em>Borrelia burgdorferi</em> after roughly 36 to 48 hours of
            attachment. Adult females are larger but are usually noticed and
            removed before transmission. Most reported Lyme cases in the United
            States originate from the unfed nymph.
          </p>
        </div>

        <div>
          <Caption>UI · Geist 13</Caption>
          <div className="ui" style={{ fontSize: 13, marginBottom: 18, color: 'var(--ink)' }}>
            Search · Compare · Sources · About
            <br />
            <span style={{ color: 'var(--muted)' }}>
              Eyebrows, navigation, table headers, button labels.
            </span>
          </div>

          <Caption>Mono · JetBrains 11–13</Caption>
          <div className="mono" style={{ fontSize: 13, marginBottom: 6 }}>
            FIPS 23005 · Cumberland County, ME
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            43.9389° N, 70.2353° W · 546 cells · 25 136 rows
          </div>
        </div>
      </div>
    </section>
  )
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="ui"
      style={{
        fontSize: 10,
        color: 'var(--muted)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  )
}
