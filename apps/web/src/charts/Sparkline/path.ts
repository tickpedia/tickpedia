// Build the SVG path `d` attribute for a sparkline given a series of
// numeric values and a target box. Pure — same input, same string.
//
// `stroke` returns the polyline that traces the data;
// `area` returns the same polyline closed back along the baseline so
// callers can fill it.

export interface PathBox {
  width: number
  height: number
  /** Vertical inset so the line doesn't graze the top/bottom edges. */
  inset?: number
}

export function projectPoints(data: readonly number[], box: PathBox): Array<[number, number]> {
  if (data.length === 0) return []
  const { width, height, inset = 2 } = box
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const usableH = height - inset * 2
  return data.map((v, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width
    const y = inset + usableH - ((v - min) / range) * usableH
    return [round(x), round(y)]
  })
}

export function strokePath(points: ReadonlyArray<[number, number]>): string {
  if (points.length === 0) return ''
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ')
}

export function areaPath(points: ReadonlyArray<[number, number]>, box: PathBox): string {
  if (points.length === 0) return ''
  const stroke = strokePath(points)
  const lastX = points[points.length - 1]![0]
  const firstX = points[0]![0]
  return `${stroke} L ${lastX} ${box.height} L ${firstX} ${box.height} Z`
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
