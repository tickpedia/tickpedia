// Loader that joins the parsed FCC file with the USPS code map and
// emits the rows we actually insert.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseFipsFile } from './parse-fips.js'
import { USPS_BY_FIPS } from './usps-codes.js'

export interface SeedState {
  fips: string // '25'
  code: string // 'MA' (USPS, uppercase, canonical)
  slug: string // 'ma' (lowercase USPS — URL form)
  name: string // 'Massachusetts' (title-cased from FCC's UPPERCASE)
}

export interface SeedCounty {
  fips: string // '25009'
  stateFips: string // '25'
  countyName: string // 'Essex County' / 'Baltimore city'
  slug: string // 'essex' / 'baltimore-city'
}

const FIPS_PATH = resolve(import.meta.dirname, '..', 'data', 'fips.txt')

let cached: { states: SeedState[]; counties: SeedCounty[] } | null = null

export function loadLocations(): { states: SeedState[]; counties: SeedCounty[] } {
  if (cached) return cached

  const content = readFileSync(FIPS_PATH, 'utf-8')
  const { states, counties } = parseFipsFile(content)

  const seedStates: SeedState[] = []
  for (const s of states) {
    const code = USPS_BY_FIPS[s.fips]
    if (!code) continue // territory we haven't mapped yet — skip silently
    seedStates.push({
      fips: s.fips,
      code,
      slug: code.toLowerCase(),
      name: titleCase(s.rawName),
    })
  }

  // Drop any county whose state isn't in our USPS map (keeps FK insert
  // safe). In practice this only filters territory rows we don't seed.
  const stateFipsSet = new Set(seedStates.map((s) => s.fips))
  const seedCounties: SeedCounty[] = counties
    .filter((c) => stateFipsSet.has(c.stateFips))
    .map((c) => ({
      fips: c.fips,
      stateFips: c.stateFips,
      countyName: c.countyName,
      slug: c.slug,
    }))

  cached = { states: seedStates, counties: seedCounties }
  return cached
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bOf\b/g, 'of')
    .replace(/\bAnd\b/g, 'and')
}
