// Pure geometry for the H3 hexagon heatmap.
//
// We render flat-top hexagons. For an axial-grid layout, the column
// stride is `sqrt(3) * r` and the row stride is `1.5 * r`; odd rows
// shift right by half a column to interleave.
//
// `hexPoints` returns the six SVG-polygon vertices for one cell at
// (cx, cy) with radius r.

export const HEX_VERTEX_COUNT = 6

export function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < HEX_VERTEX_COUNT; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    pts.push(`${round(x)},${round(y)}`)
  }
  return pts.join(' ')
}

export function gridDimensions(canvasWidth: number, canvasHeight: number, r: number) {
  const colStride = Math.sqrt(3) * r
  const rowStride = r * 1.5
  return {
    cols: Math.floor(canvasWidth / colStride),
    rows: Math.floor(canvasHeight / rowStride),
    colStride,
    rowStride,
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
