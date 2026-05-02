// LineChart projection: turn an array of values into points laid out
// inside a padded plot box. Pads on left for y-axis labels, on top
// for the section eyebrow, on bottom for x-axis labels, on right for
// breathing room past the final point.

export interface LineBox {
  width: number
  height: number
  pad: { l: number; r: number; t: number; b: number }
}

export const DEFAULT_PAD = { l: 44, r: 16, t: 16, b: 28 }

export function plotArea(box: LineBox): { w: number; h: number } {
  return { w: box.width - box.pad.l - box.pad.r, h: box.height - box.pad.t - box.pad.b }
}

export function projectLine(data: readonly number[], box: LineBox): Array<[number, number]> {
  if (data.length === 0) return []
  const { w, h } = plotArea(box)
  const max = Math.max(...data, 1)
  const last = Math.max(data.length - 1, 1)
  return data.map((v, i) => [
    box.pad.l + (i / last) * w,
    box.pad.t + h - (v / max) * h,
  ])
}

export function strokePath(points: ReadonlyArray<[number, number]>): string {
  if (points.length === 0) return ''
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${round(x)} ${round(y)}`).join(' ')
}

export function areaPath(points: ReadonlyArray<[number, number]>, box: LineBox): string {
  if (points.length === 0) return ''
  const stroke = strokePath(points)
  const baselineY = box.pad.t + plotArea(box).h
  const firstX = round(points[0]![0])
  const lastX = round(points[points.length - 1]![0])
  return `${stroke} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
