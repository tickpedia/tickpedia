import { hexPoints } from './hex-geometry.js'

// One hex cell. Splitting it out keeps the parent grid loop tidy and
// gives us a place to hang per-cell hover affordances later (tooltip,
// FIPS list, drill-into-disease).

export interface CellProps {
  cx: number
  cy: number
  r: number
  fill: string
}

export function Cell({ cx, cy, r, fill }: CellProps) {
  return (
    <polygon
      className="hex-cell"
      points={hexPoints(cx, cy, r)}
      fill={fill}
      stroke="var(--bg)"
      strokeWidth="0.5"
    />
  )
}
