// Token swatches: semantic colors + the ordinal data ramp used by every
// chart primitive. Pulls live from the active theme, so flipping the
// theme bar reflows the swatches.

interface SwatchSpec {
  token: string
  name: string
}

const SEMANTIC: readonly SwatchSpec[] = [
  { token: 'bg', name: 'Paper' },
  { token: 'surface', name: 'Surface' },
  { token: 'ink', name: 'Ink' },
  { token: 'muted', name: 'Muted' },
  { token: 'accent', name: 'Brick · accent' },
  { token: 'accent-2', name: 'Ember' },
]

const RAMP: readonly SwatchSpec[] = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'].map(
  (k) => ({ token: k, name: k.toUpperCase() }),
)

export function PaletteSection() {
  return (
    <section style={{ marginTop: 56 }}>
      <div className="ui eyebrow" style={{ marginBottom: 14 }}>
        Palette · paper, ink, brick
      </div>
      <SwatchGrid swatches={SEMANTIC} />

      <div className="ui eyebrow" style={{ margin: '24px 0 12px' }}>
        Data ramp · low → high (choropleth, hex heatmap, leaderboard)
      </div>
      <SwatchGrid swatches={RAMP} />
    </section>
  )
}

function SwatchGrid({ swatches }: { swatches: readonly SwatchSpec[] }) {
  return (
    <div
      data-testid="palette-grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, maxWidth: 720 }}
    >
      {swatches.map(({ token, name }) => (
        <div key={token} className="swatch">
          <div className="chip" style={{ background: `var(--${token})` }} />
          <div className="label">
            <span>{name}</span>
            <span style={{ color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              --{token}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
