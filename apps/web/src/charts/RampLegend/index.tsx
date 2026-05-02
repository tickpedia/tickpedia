import { DATA_RAMP, type DataRamp } from '../ramp.js'

// Inline legend strip for any ramp-encoded chart. Compact: low-edge
// label, ramp swatches, high-edge label. Optional vertical layout for
// portrait sidebars.

export interface RampLegendProps {
  ramp?: DataRamp
  /** Two strings: low and high edge labels. */
  labels?: readonly [string, string]
  vertical?: boolean
}

export function RampLegend({
  ramp = DATA_RAMP,
  labels = ['less', 'more'],
  vertical = false,
}: RampLegendProps) {
  return (
    <div
      className="ui"
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: 6,
        alignItems: 'center',
        fontSize: 10,
        color: 'var(--muted)',
        fontFamily: '"Geist", sans-serif',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
      data-testid="ramp-legend"
    >
      <span>{labels[0]}</span>
      <div style={{ display: 'flex' }}>
        {ramp.map((c, i) => (
          <div
            key={i}
            style={{ width: 16, height: 8, background: c, border: '1px solid var(--rule)' }}
          />
        ))}
      </div>
      <span>{labels[1]}</span>
    </div>
  )
}
