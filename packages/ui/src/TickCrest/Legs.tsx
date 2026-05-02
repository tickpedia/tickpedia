import { legPath } from './leg-path.js'

// Eight hairline legs radiating from the body. Adult Ixodidae have
// eight; the crest always renders all eight regardless of life-stage.
//
// `color` should be the editorial leg color (or DEFAULT_TICK_ART.legColor
// when null) — resolved by the caller.

const LEG_ANGLES = [-32, -18, 18, 32] as const

export interface LegsProps {
  color: string
}

export function Legs({ color }: LegsProps) {
  return (
    <g stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none">
      {LEG_ANGLES.map((angle) => (
        <g key={angle}>
          <path d={legPath(50, 56, angle, 'L')} />
          <path d={legPath(50, 56, -angle, 'R')} />
        </g>
      ))}
    </g>
  )
}
