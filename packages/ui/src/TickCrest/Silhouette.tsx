// Body + head + capitulum + mouthparts + N/E/S/W compass ticks. The
// silhouette is the same at every size — only the SVG box scales.

export interface SilhouetteProps {
  headColor: string
  bodyColor: string
  /** Used for the four compass tick marks; matches outer-ring opacity. */
  ringStrokeWidth: number
}

export function Silhouette({ headColor, bodyColor, ringStrokeWidth }: SilhouetteProps) {
  return (
    <>
      <ellipse cx="50" cy="56" rx="14" ry="18" fill={bodyColor} />
      <ellipse cx="50" cy="50" rx="10" ry="9" fill={headColor} opacity="0.92" />
      <path d="M 47 38 Q 50 33 53 38 L 52 42 L 48 42 Z" fill={headColor} />
      <line x1="50" y1="33" x2="50" y2="29" stroke={headColor} strokeWidth="1.2" strokeLinecap="round" />

      {[0, 90, 180, 270].map((a) => (
        <line
          key={a}
          x1="50" y1="3" x2="50" y2="6"
          stroke="currentColor" opacity="0.4" strokeWidth={ringStrokeWidth}
          transform={`rotate(${a} 50 50)`}
        />
      ))}
    </>
  )
}
