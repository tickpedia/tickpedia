import { describe, it, expect } from 'vitest'
import { pickNearestCounties, type CountyWithCentroid } from '../neighbours.js'

const FOCAL: CountyWithCentroid = {
  fips: '23005',
  slug: 'cumberland',
  stateFips: '23',
  countyName: 'Cumberland',
  latitude: 43.94,
  longitude: -70.24,
}

const POOL: CountyWithCentroid[] = [
  // Same county — must be excluded.
  FOCAL,
  // Same state, very close.
  { fips: '23031', slug: 'york', stateFips: '23', countyName: 'York', latitude: 43.40, longitude: -70.65 },
  { fips: '23023', slug: 'sagadahoc', stateFips: '23', countyName: 'Sagadahoc', latitude: 43.91, longitude: -69.85 },
  // Cross-state, ~100km south.
  { fips: '33015', slug: 'rockingham', stateFips: '33', countyName: 'Rockingham', latitude: 42.99, longitude: -71.13 },
  // Cross-country, far away — should never appear in top 6.
  { fips: '06037', slug: 'los-angeles', stateFips: '06', countyName: 'Los Angeles', latitude: 34.05, longitude: -118.24 },
  // Missing centroid — must be excluded.
  { fips: '23999', slug: 'no-centroid', stateFips: '23', countyName: 'NoCentroid', latitude: null, longitude: null },
]

describe('pickNearestCounties', () => {
  it('excludes the focal county itself', () => {
    const out = pickNearestCounties(FOCAL, POOL, 6)
    expect(out.find((r) => r.fips === FOCAL.fips)).toBeUndefined()
  })

  it('excludes counties without a centroid', () => {
    const out = pickNearestCounties(FOCAL, POOL, 6)
    expect(out.find((r) => r.fips === '23999')).toBeUndefined()
  })

  it('orders results by ascending distance', () => {
    const out = pickNearestCounties(FOCAL, POOL, 6)
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!.distanceKm).toBeGreaterThanOrEqual(out[i - 1]!.distanceKm)
    }
  })

  it('crosses state borders — proximity, not jurisdiction', () => {
    const out = pickNearestCounties(FOCAL, POOL, 6)
    expect(out.some((r) => r.stateFips !== FOCAL.stateFips)).toBe(true)
  })

  it('caps the result at the requested count', () => {
    expect(pickNearestCounties(FOCAL, POOL, 2)).toHaveLength(2)
    expect(pickNearestCounties(FOCAL, POOL, 100).length).toBeLessThanOrEqual(POOL.length - 2)
  })

  it('returns empty array when the focal county has no centroid', () => {
    const blind = { ...FOCAL, latitude: null, longitude: null }
    expect(pickNearestCounties(blind, POOL, 6)).toEqual([])
  })

  it('computes haversine distance in kilometres (sanity check)', () => {
    const out = pickNearestCounties(FOCAL, POOL, 6)
    const york = out.find((r) => r.fips === '23031')
    expect(york).toBeDefined()
    // York centroid is ~70 km SW of Cumberland centroid; allow a wide
    // tolerance because the centroids in the test fixture are coarse.
    expect(york!.distanceKm).toBeGreaterThan(20)
    expect(york!.distanceKm).toBeLessThan(120)
  })
})
