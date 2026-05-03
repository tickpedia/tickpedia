// Cache keys for the county page family. Keyed by `state-slug:county-slug`
// for the page itself (slugs aren't unique across states), and by
// `countyFips` (the canonical PK on counties) for everything derived
// from a single county row.

export function countyCacheKey(stateSlug: string, countySlug: string): string {
  return `county:${stateSlug}/${countySlug}`
}

export function countyDiseasesCacheKey(countyFips: string): string {
  return `countyDiseases:${countyFips}`
}

export function countyTicksCacheKey(countyFips: string): string {
  return `countyTicks:${countyFips}`
}

export function countyNeighboursCacheKey(countyFips: string): string {
  return `countyNeighbours:${countyFips}`
}

export function countiesLeaderboardCacheKey(): string {
  return 'countiesLeaderboard'
}
