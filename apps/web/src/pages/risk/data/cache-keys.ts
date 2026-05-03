// Cache-key helpers for the /risk and /risk/[disease-slug] pages.

export function riskHeatmapCacheKey(diseaseSlug?: string): string {
  return diseaseSlug ? `riskHeatmap:${diseaseSlug}` : 'riskHeatmap'
}

export function riskHotspotsCacheKey(): string {
  return 'riskHotspots'
}

export function riskDiseasesCacheKey(): string {
  return 'riskDiseases'
}

export function riskDiseasePageCacheKey(slug: string): string {
  return `riskDisease:${slug}`
}
