// Cache keys for the state page family. Each builder returns the
// string used by `SSRDataProvider` to key into the prefetched data
// cache.

export function stateCacheKey(slug: string): string {
  return `state:${slug}`
}

export function stateTicksCacheKey(stateFips: string): string {
  return `stateTicks:${stateFips}`
}

export function stateDiseasesCacheKey(stateFips: string): string {
  return `stateDiseases:${stateFips}`
}

export function stateCountiesCacheKey(stateFips: string): string {
  return `stateCounties:${stateFips}`
}

export function stateCountyHotspotsCacheKey(stateFips: string): string {
  return `stateCountyHotspots:${stateFips}`
}

export function statesIndexCacheKey(): string {
  return 'statesIndex'
}
