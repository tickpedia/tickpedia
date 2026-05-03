// Loader that joins the parsed FCC file with the USPS code map, the
// Census Gazetteer centroids, and the EXTRA_COUNTIES patch list, and
// emits the rows we actually insert.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { slugify } from '../../normalize.js'
import { parseFipsFile } from './parse-fips.js'
import { USPS_BY_FIPS } from './usps-codes.js'
import { EXTRA_COUNTIES } from './extra-counties.js'

export interface SeedState {
  fips: string // '25'
  code: string // 'MA' (USPS, uppercase, canonical)
  slug: string // 'massachusetts' (full name, slugified — URL form;
  //              "maine" gets ~50× the search volume of "me")
  name: string // 'Massachusetts' (title-cased from FCC's UPPERCASE)
}

export interface SeedCounty {
  fips: string // '25009'
  stateFips: string // '25'
  countyName: string // 'Essex County' / 'Baltimore city'
  slug: string // 'essex' / 'baltimore-city'
  latitude: number | null // Census internal-point centroid; null if absent
  longitude: number | null
}

const FIPS_PATH = resolve(import.meta.dirname, '..', 'data', 'fips.txt')
const CENTROIDS_PATH = resolve(import.meta.dirname, '..', 'data', 'county_centroids.txt')

let cached: { states: SeedState[]; counties: SeedCounty[] } | null = null

export function loadLocations(): { states: SeedState[]; counties: SeedCounty[] } {
  if (cached) return cached

  const content = readFileSync(FIPS_PATH, 'utf-8')
  const { states, counties } = parseFipsFile(content)
  const centroids = loadCentroids()

  const seedStates: SeedState[] = []
  for (const s of states) {
    const code = USPS_BY_FIPS[s.fips]
    if (!code) continue // territory we haven't mapped yet — skip silently
    const name = titleCase(s.rawName)
    seedStates.push({
      fips: s.fips,
      code,
      slug: slugify(name),
      name,
    })
  }

  // Drop any county whose state isn't in our USPS map (keeps FK insert
  // safe). In practice this only filters territory rows we don't seed.
  const stateFipsSet = new Set(seedStates.map((s) => s.fips))
  const seedCounties: SeedCounty[] = counties
    .filter((c) => stateFipsSet.has(c.stateFips))
    .map((c) => {
      const centroid = centroids.get(c.fips)
      return {
        fips: c.fips,
        stateFips: c.stateFips,
        countyName: c.countyName,
        slug: c.slug,
        latitude: centroid?.latitude ?? null,
        longitude: centroid?.longitude ?? null,
      }
    })

  // Patch in counties created/renamed after the FCC snapshot we ship.
  // De-dupe by FIPS — the file is the source of truth for anything it
  // does cover. EXTRA_COUNTIES still gets centroids if the Gazetteer
  // covers them (it usually does, even when FCC doesn't).
  const seenFips = new Set(seedCounties.map((c) => c.fips))
  for (const extra of EXTRA_COUNTIES) {
    if (seenFips.has(extra.fips)) continue
    if (!stateFipsSet.has(extra.stateFips)) continue
    const centroid = centroids.get(extra.fips)
    seedCounties.push({
      ...extra,
      latitude: centroid?.latitude ?? null,
      longitude: centroid?.longitude ?? null,
    })
    seenFips.add(extra.fips)
  }

  cached = { states: seedStates, counties: seedCounties }
  return cached
}

interface Centroid {
  latitude: number
  longitude: number
}

function loadCentroids(): Map<string, Centroid> {
  // Census 2024 Gazetteer county file. Tab-separated; columns:
  //   USPS  GEOID  ANSICODE  NAME  ALAND  AWATER  ALAND_SQMI  AWATER_SQMI
  //   INTPTLAT  INTPTLONG
  // GEOID is the 5-char FIPS; INTPTLAT/INTPTLONG are signed decimal
  // degrees (lat in [-90, 90], lon in [-180, 180]).
  const content = readFileSync(CENTROIDS_PATH, 'utf-8')
  const out = new Map<string, Centroid>()
  const lines = content.split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const parts = line.split('\t')
    if (parts.length < 10) continue
    const fips = parts[1]?.trim()
    const lat = parts[8]?.trim()
    const lon = parts[9]?.trim()
    if (!fips || !lat || !lon) continue
    const latitude = Number(lat)
    const longitude = Number(lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
    out.set(fips, { latitude, longitude })
  }
  return out
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bOf\b/g, 'of')
    .replace(/\bAnd\b/g, 'and')
}
