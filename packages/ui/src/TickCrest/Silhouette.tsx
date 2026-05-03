// Body + head + four compass marks. Geometry mirrors `tickSvg` /
// `tickCrestSvg` in tick-art.ts so the React TickCrest, the inline
// admin-preview TickArt, and the OG image generator all show the same
// silhouette.

export interface SilhouetteProps {
  headColor: string
  bodyColor: string
  /** Used for the four compass tick marks; matches outer-ring opacity. */
  ringStrokeWidth: number
}

export function Silhouette({ headColor, bodyColor, ringStrokeWidth }: SilhouetteProps) {
  return (
    <>
      {[0, 90, 180, 270].map((a) => (
        <line
          key={a}
          x1="50" y1="3" x2="50" y2="6"
          stroke="currentColor" opacity="0.4" strokeWidth={ringStrokeWidth}
          strokeLinecap="round"
          transform={`rotate(${a} 50 50)`}
        />
      ))}

      <ellipse cx="50" cy="62" rx="16" ry="22" fill={bodyColor} />
      <circle cx="50" cy="34" r="10" fill={headColor} />
    </>
  )
}
