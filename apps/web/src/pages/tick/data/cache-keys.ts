// Cache-key helpers for the SSR data store. Live in their own module
// (no React, no `beam` import) so the prerender script can pull
// them into a Node entrypoint without dragging the browser-side
// SemiLayer client through tsx's path resolver.
//
// The hooks in this directory and the prefetch helpers in
// `src/ssr/prefetch/` both import from here so cache keys stay in
// sync without a central registry.

export function tickCacheKey(slug: string): string {
  return `tick:${slug}`
}

export function tickRangeCacheKey(tickId: number): string {
  return `tickRange:${tickId}`
}

export function tickDiseasesCacheKey(tickId: number): string {
  return `tickDiseases:${tickId}`
}

export function tickTechniquesCacheKey(tickId: number): string {
  return `tickTechniques:${tickId}`
}

export function tickPathogensCacheKey(tickId: number): string {
  return `tickPathogens:${tickId}`
}
