import { TickCrest, type TickArtColors } from '@tickpedia/ui'

// Three real species, all rendered through the single `TickCrest`
// primitive — same SVG, three different editorial color sets. Plus the
// three crest sizes (badge / tile / hero) for review.

interface SampleTick {
  common: string
  scientific: string
  colors: TickArtColors
}

const SAMPLES: SampleTick[] = [
  {
    common: 'Blacklegged',
    scientific: 'Ixodes scapularis',
    colors: { headColor: '#1c1814', bodyColor: '#8a2a1a', legColor: '#1c1814' },
  },
  {
    common: 'Lone Star',
    scientific: 'Amblyomma americanum',
    colors: { headColor: '#3d2c1a', bodyColor: '#7a4a26', legColor: '#1b1208' },
  },
  {
    common: 'Brown Dog',
    scientific: 'Rhipicephalus sanguineus',
    colors: { headColor: '#4a2410', bodyColor: '#9c6a3a', legColor: '#2a1808' },
  },
]

export function CrestSection() {
  return (
    <section style={{ marginTop: 56 }}>
      <div className="ui eyebrow" style={{ marginBottom: 14 }}>
        Crest · sizes
      </div>

      <div
        style={{
          display: 'flex',
          gap: 40,
          alignItems: 'flex-end',
          padding: '20px 0',
          borderTop: '1px solid var(--rule)',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <CrestSpec
          size="hero"
          label="hero · 220px"
          common="Lone Star"
          scientific="Amblyomma americanum"
          colors={SAMPLES[1]!.colors}
        />
        <CrestSpec
          size="tile"
          label="tile · 80px"
          common="Blacklegged"
          scientific="Ixodes scapularis"
          colors={SAMPLES[0]!.colors}
        />
        <CrestSpec
          size="badge"
          label="badge · 28px"
          colors={SAMPLES[0]!.colors}
        />
      </div>

      <p
        className="ui"
        style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, maxWidth: 640 }}
      >
        Crest reads <code>ticks.{`{headColor, bodyColor, legColor}`}</code> from
        the editorial row. At hero size it carries the scientific name on the
        top arc plus a family epithet on the bottom. Below 36px the ring drops
        away and only the silhouette remains.
      </p>

      <div className="ui eyebrow" style={{ margin: '32px 0 14px' }}>
        Three real species, same primitive
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 720 }}>
        {SAMPLES.map((t) => (
          <div key={t.common} style={{ textAlign: 'center' }}>
            <TickCrest
              size="tile"
              colors={t.colors}
              common={t.common}
              scientific={t.scientific}
            />
            <div className="tp-serif" style={{ fontSize: 14, marginTop: 10, fontStyle: 'italic' }}>
              {t.scientific}
            </div>
            <div
              className="ui"
              style={{
                fontSize: 10,
                color: 'var(--muted)',
                marginTop: 2,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {t.common}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

interface CrestSpecProps {
  size: 'badge' | 'tile' | 'hero'
  label: string
  colors: TickArtColors
  common?: string
  scientific?: string
}

function CrestSpec({ size, label, colors, common = '', scientific = '' }: CrestSpecProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <TickCrest size={size} colors={colors} common={common} scientific={scientific} />
      <div
        className="ui"
        style={{
          fontSize: 10,
          color: 'var(--muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  )
}
