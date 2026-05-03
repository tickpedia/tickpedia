// Pure helpers for the seasonality peak chip. Lives in its own file
// — no React, no `beam` import — so the prerender script (Node + tsx)
// can pull it in without dragging the runtime SemiLayer client through
// the `@/beam` path alias.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const PEAK_RATIO = 1.3

export interface PeakInfo {
  /** 1-based month number, or null if seasonality is too flat. */
  month: number | null
  monthName: string | null
  count: number
}

export interface SeasonalityShape {
  months: number[]
  total: number
}

/**
 * Pick the peak month — but only return one when its share is at
 * least 1.3× the average month, per the brief. A flat distribution
 * has no honest "peak" and we'd rather hide the chip than mislead.
 */
export function pickPeakMonth(data: SeasonalityShape | null): PeakInfo {
  if (!data || data.total <= 0) return { month: null, monthName: null, count: 0 }
  const max = Math.max(...data.months)
  const avg = data.total / 12
  if (avg <= 0 || max < avg * PEAK_RATIO) {
    return { month: null, monthName: null, count: max }
  }
  const idx = data.months.indexOf(max)
  return {
    month: idx + 1,
    monthName: MONTH_NAMES[idx] ?? null,
    count: max,
  }
}
