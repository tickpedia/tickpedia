// Cache-key helpers for the SSR data store. No React, no `beam` import
// — same shape as other page families' cache-keys modules so the
// prerender script can pull keys without dragging the runtime client
// through the `@/beam` path alias.

export function techniqueCacheKey(slug: string): string {
  return `technique:${slug}`
}

export function techniqueTicksCacheKey(techniqueId: number): string {
  return `techniqueTicks:${techniqueId}`
}

export function techniqueDiseasesCacheKey(techniqueId: number): string {
  return `techniqueDiseases:${techniqueId}`
}

export function techniquesIndexCacheKey(): string {
  return 'techniquesIndex'
}
