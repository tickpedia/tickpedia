// Cache-key helpers for the SSR data store. Mirrors the shape of
// `pages/tick/data/cache-keys.ts` — no React, no `beam` import — so
// the prerender script can pull the keys into a Node entrypoint
// without dragging the browser-side SemiLayer client through tsx's
// path resolver.

export function diseaseCacheKey(slug: string): string {
  return `disease:${slug}`
}

export function diseaseStatesCacheKey(diseaseId: number): string {
  return `diseaseStates:${diseaseId}`
}

export function diseaseSeasonalityCacheKey(diseaseId: number): string {
  return `diseaseSeasonality:${diseaseId}`
}

export function diseaseHistoryCacheKey(diseaseId: number): string {
  return `diseaseHistory:${diseaseId}`
}

export function diseaseTicksCacheKey(diseaseId: number): string {
  return `diseaseTicks:${diseaseId}`
}

export function diseasePathogensCacheKey(diseaseId: number): string {
  return `diseasePathogens:${diseaseId}`
}
