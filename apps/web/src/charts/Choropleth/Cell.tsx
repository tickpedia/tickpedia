// One state square: a colored rect + the 2-letter USPS code in
// the center. The label flips to the inverse ink when the cell sits
// on a high-ramp fill so it stays legible against the dark.
//
// Optionally wraps the rect+text in an `<a>` (SVG link) when `href`
// is set, and emits a `<title>` child for native hover tooltips.
// Both are opt-in — pure-decorative choropleths still render as a
// plain `<g>` with no extra DOM.

export interface CellProps {
  code: string
  x: number
  y: number
  size: number
  fill: string
  /** Index of the fill in the ramp; >=3 swaps to the inverse label color. */
  rampIndex: number
  /** If set, the cell becomes a link to this URL. */
  href?: string
  /** If set, becomes the SVG `<title>` child (browser-native tooltip). */
  title?: string
}

export function Cell({ code, x, y, size, fill, rampIndex, href, title }: CellProps) {
  const labelFill = rampIndex >= 3 ? 'var(--bg)' : 'var(--ink-2)'
  const inner = (
    <>
      {title && <title>{title}</title>}
      <rect
        x={x + 1}
        y={y + 1}
        width={size - 2}
        height={size - 2}
        fill={fill}
        stroke="var(--rule)"
        strokeWidth="0.5"
      />
      <text
        x={x + size / 2}
        y={y + size / 2 + 3}
        textAnchor="middle"
        fontSize={size * 0.34}
        fill={labelFill}
        fontFamily='"Geist", sans-serif'
        fontWeight="500"
        pointerEvents="none"
      >
        {code}
      </text>
    </>
  )
  if (href) {
    return (
      <a href={href} aria-label={title ?? code} data-state-code={code}>
        {inner}
      </a>
    )
  }
  return <g data-state-code={code}>{inner}</g>
}
