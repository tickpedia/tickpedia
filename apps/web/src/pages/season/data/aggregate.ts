// Pure helper, split out of `useSeasonality.ts` so the SSR prefetch
// can import it without dragging in the BeamClient (the runtime hook
// imports `@/beam`, which the tsx-driven prerender can't resolve via
// the Vite path alias).

export interface SeasonalityData {
  /** [Jan, Feb, ..., Dec] — sum of CDC reported cases across diseases. */
  cumulativeByMonth: number[]
  /** Per-disease summary for the side rail. */
  perDisease: Array<{
    diseaseId: number
    total: number
    /** 1-12 (1 = January). 0 if no data. */
    peakMonth: number
  }>
}

export interface RawSeasonalityBucket {
  dims: { month?: unknown; diseaseId?: unknown }
  measures: { total?: number | null }
}

export function aggregateSeasonality(
  buckets: ReadonlyArray<RawSeasonalityBucket>,
): SeasonalityData {
  const cumulative = new Array<number>(12).fill(0)
  const byDisease = new Map<number, number[]>()

  for (const b of buckets) {
    const month = Number(b.dims.month)
    const diseaseId = Number(b.dims.diseaseId)
    const total = b.measures.total ?? 0
    if (!Number.isFinite(month) || month < 1 || month > 12) continue
    if (!Number.isFinite(diseaseId)) continue
    const idx = month - 1
    cumulative[idx] = (cumulative[idx] ?? 0) + total
    if (!byDisease.has(diseaseId)) {
      byDisease.set(diseaseId, new Array<number>(12).fill(0))
    }
    const arr = byDisease.get(diseaseId)!
    arr[idx] = (arr[idx] ?? 0) + total
  }

  const perDisease = [...byDisease.entries()].map(([diseaseId, months]) => {
    let peak = 0
    let peakIdx = 0
    let total = 0
    for (let i = 0; i < months.length; i++) {
      const v = months[i] ?? 0
      total += v
      if (v > peak) {
        peak = v
        peakIdx = i
      }
    }
    return {
      diseaseId,
      total,
      peakMonth: total > 0 ? peakIdx + 1 : 0,
    }
  })

  return { cumulativeByMonth: cumulative, perDisease }
}
