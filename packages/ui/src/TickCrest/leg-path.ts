// Quadratic Bezier path for one leg of the crest.
//
// The body sits at (cx, cy). A leg projects from a point near the body
// outward at the given angle. `side` chooses which side of the body
// (mirror x). The curve is shaped to give the crest a faint motion to
// the legs without going cartoonish.
//
// Pure function — same inputs, same string. Tested for shape (starts
// with `M`, contains a `Q`, ends with two coordinates).

export type LegSide = 'L' | 'R'

export function legPath(cx: number, cy: number, angleDeg: number, side: LegSide): string {
  const a = (angleDeg * Math.PI) / 180
  const x1 = cx + Math.sin(a) * 6
  const y1 = cy - Math.cos(a) * 4
  const dir = side === 'L' ? -1 : 1
  const ex = cx + dir * (10 + Math.abs(angleDeg) * 0.05)
  const ey = cy + Math.tan(a) * 12
  const mx = (x1 + ex) / 2 + dir * 3
  const my = (y1 + ey) / 2 - 2
  return `M ${x1} ${y1} Q ${mx} ${my} ${ex} ${ey}`
}
