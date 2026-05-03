// Cache-key helpers for the SSR data store. No React, no `beam` import.

export function homeStatsCacheKey(): string {
  return 'homeStats'
}

export function homeHeatmapCacheKey(): string {
  return 'homeHeatmap'
}

export function homeTrendingCacheKey(): string {
  return 'homeTrending'
}

export function homeLatestFactCacheKey(): string {
  return 'homeLatestFact'
}

export function homeRecentlyEstablishedCacheKey(): string {
  return 'homeRecentlyEstablished'
}
