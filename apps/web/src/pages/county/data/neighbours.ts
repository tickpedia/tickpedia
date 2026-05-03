// Border-agnostic neighbouring-county picker. Given a focal county
// and the universe of counties (with lat/lng centroids), returns the
// N nearest by haversine distance. Used by the county-page sidebar.
//
// Cross-state by design — the design's "Neighbouring counties · ≤120 km"
// note explicitly calls out lat/lng proximity, not state border.

export interface CountyWithCentroid {
  fips: string
  slug: string
  stateFips: string
  countyName: string
  latitude: number | null
  longitude: number | null
}

export interface NeighbourRow {
  fips: string
  slug: string
  stateFips: string
  countyName: string
  /** Haversine kilometres from the focal county's centroid. */
  distanceKm: number
}

const EARTH_RADIUS_KM = 6371

export function pickNearestCounties(
  focal: CountyWithCentroid,
  pool: readonly CountyWithCentroid[],
  count: number,
): NeighbourRow[] {
  if (focal.latitude === null || focal.longitude === null) return []
  const focalLat = focal.latitude
  const focalLng = focal.longitude

  const ranked: NeighbourRow[] = []
  for (const c of pool) {
    if (c.fips === focal.fips) continue
    if (c.latitude === null || c.longitude === null) continue
    const distanceKm = haversineKm(focalLat, focalLng, c.latitude, c.longitude)
    ranked.push({
      fips: c.fips,
      slug: c.slug,
      stateFips: c.stateFips,
      countyName: c.countyName,
      distanceKm,
    })
  }
  ranked.sort((a, b) => a.distanceKm - b.distanceKm)
  return ranked.slice(0, count)
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
