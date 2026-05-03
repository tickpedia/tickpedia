// Cache-key helpers for the SSR data store. No React, no `beam` import
// — same shape as other page families' cache-keys modules so the
// prerender script can pull keys without dragging the runtime client
// through the `@/beam` path alias.

export function factCacheKey(slug: string): string {
  return `fact:${slug}`
}

export function factRefsCacheKey(factId: number): string {
  return `factRefs:${factId}`
}

export function factRelatedCacheKey(factId: number): string {
  return `factRelated:${factId}`
}

export function factsIndexCacheKey(): string {
  return 'factsIndex'
}

/** Per-entity rail of "wild facts that reference me", used by tick/disease/technique pages. */
export function entityFactsCacheKey(kind: 'tick' | 'disease' | 'technique', id: number): string {
  return `entityFacts:${kind}:${id}`
}
