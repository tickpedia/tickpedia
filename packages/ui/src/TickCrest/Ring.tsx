import type { TickCrestVariant } from './sizes.js'

// Outer double-ring + optional ring-text on top/bottom arcs.
//
// `topPathId` / `bottomPathId` are DOM-unique strings provided by the
// composing component (see path-id.ts) — required so multiple crests
// on the same page don't collide on <defs>.

const RING_RADIUS = 45
const TOP_PATH = `M ${50 - RING_RADIUS} 50 A ${RING_RADIUS} ${RING_RADIUS} 0 0 1 ${50 + RING_RADIUS} 50`
const BOT_PATH = `M ${50 - RING_RADIUS} 50 A ${RING_RADIUS} ${RING_RADIUS} 0 0 0 ${50 + RING_RADIUS} 50`

export interface RingProps {
  variant: TickCrestVariant
  strokeWidth: number
  showText: boolean
  scientific: string
  familyEpithet: string
  topPathId: string
  bottomPathId: string
}

export function Ring({
  variant,
  strokeWidth,
  showText,
  scientific,
  familyEpithet,
  topPathId,
  bottomPathId,
}: RingProps) {
  return (
    <>
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.28" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth={strokeWidth * 0.6} opacity="0.18" />

      {showText && (
        <>
          <defs>
            <path id={topPathId} d={TOP_PATH} />
            {variant === 'hero' && <path id={bottomPathId} d={BOT_PATH} />}
          </defs>

          {scientific && (
            <text
              fontFamily='"Geist", sans-serif'
              fontSize={variant === 'hero' ? 5.5 : 7}
              letterSpacing="0.18em"
              fill="currentColor"
              opacity="0.7"
            >
              <textPath href={`#${topPathId}`} startOffset="50%" textAnchor="middle">
                {scientific.toUpperCase()}
              </textPath>
            </text>
          )}

          {variant === 'hero' && familyEpithet && (
            <text
              fontFamily='"Geist", sans-serif'
              fontSize="4.5"
              letterSpacing="0.3em"
              fill="currentColor"
              opacity="0.5"
            >
              <textPath href={`#${bottomPathId}`} startOffset="50%" textAnchor="middle">
                {familyEpithet}
              </textPath>
            </text>
          )}
        </>
      )}
    </>
  )
}
