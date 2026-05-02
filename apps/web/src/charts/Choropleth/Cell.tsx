// One state square: a colored rect + the 2-letter USPS code in
// the center. The label flips to the inverse ink when the cell sits
// on a high-ramp fill so it stays legible against the dark.

export interface CellProps {
  code: string
  x: number
  y: number
  size: number
  fill: string
  /** Index of the fill in the ramp; >=3 swaps to the inverse label color. */
  rampIndex: number
}

export function Cell({ code, x, y, size, fill, rampIndex }: CellProps) {
  const labelFill = rampIndex >= 3 ? 'var(--bg)' : 'var(--ink-2)'
  return (
    <g>
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
      >
        {code}
      </text>
    </g>
  )
}
