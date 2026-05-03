// Cache-key helpers for the SSR data store. Mirrors the shape of
// `pages/disease/data/cache-keys.ts` — no React, no `beam` import — so
// the prerender script can pull the keys into a Node entrypoint
// without dragging the browser-side SemiLayer client through tsx's
// path resolver.

export function pathogenCacheKey(slug: string): string {
  return `pathogen:${slug}`
}

export function pathogenCountiesCacheKey(pathogenId: number): string {
  return `pathogenCounties:${pathogenId}`
}

export function pathogenSpreadCacheKey(pathogenId: number): string {
  return `pathogenSpread:${pathogenId}`
}

export function pathogenTicksCacheKey(pathogenId: number): string {
  return `pathogenTicks:${pathogenId}`
}

export function pathogenDiseasesCacheKey(pathogenId: number): string {
  return `pathogenDiseases:${pathogenId}`
}

export function pathogensIndexCacheKey(): string {
  return 'pathogensIndex'
}
