// Parser for the FCC FIPS reference file.
// Source: https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt
//
// The file has two sections:
//
//   state-level    place
//    FIPS code     name
//   -----------   -------
//       01        ALABAMA
//       02        ALASKA
//
//   county-level      place
//    FIPS code        name
//   ------------    --------------
//      01000        Alabama                     ← state rollup, skip
//      01001        Autauga County
//      02068        Denali Borough              (created after 1990)  ← strip note
//      24510        Baltimore city              ← Virginia-style independent city
//
// Slug rules:
//   - State slug = lowercase USPS code ('ma', 'dc'). Comes from
//     usps-codes.ts, not from this parser.
//   - County slug = name with one of these suffixes stripped, then
//     lowercased and slugified. Suffixes are matched case-insensitively
//     except 'city' which is preserved when lowercase (it marks an
//     independent city in VA / MD / NV — slug needs to differ from a
//     same-named County).
//
//     stripped suffixes (longest first):
//       'City and Borough'
//       'Census Area'
//       'Borough'
//       'Municipality'
//       'Municipio'
//       'Parish'
//       'County'
//
//   Examples:
//     'Autauga County'             → 'autauga'
//     'Aleutians East Borough'     → 'aleutians-east'
//     'Sitka City and Borough'     → 'sitka'
//     'Yukon-Koyukuk Census Area'  → 'yukon-koyukuk'
//     'Baltimore County'  (24005)  → 'baltimore'
//     'Baltimore city'    (24510)  → 'baltimore-city'
//     'Carson City'       (32510)  → 'carson-city'

import { slugify } from '../../normalize.js'

export interface ParsedState {
  fips: string // 2 chars, e.g. '25'
  rawName: string // Uppercase from the file, e.g. 'MASSACHUSETTS'
}

export interface ParsedCounty {
  fips: string // 5 chars, e.g. '25009'
  stateFips: string // first 2 chars of fips
  rawName: string // 'Essex County', 'Baltimore city', 'Sitka City and Borough'
  countyName: string // human display: 'Essex County', 'Baltimore', 'Sitka City and Borough'
  slug: string // 'essex', 'baltimore-city', 'sitka', etc.
}

const STATE_LINE = /^\s+(\d{2})\s+([A-Z][A-Z .]+?)\s*$/
const COUNTY_LINE = /^\s+(\d{5})\s+(.+?)\s*$/

// Strip a trailing parenthesized note: 'Denali Borough (created after 1990)'
// → 'Denali Borough'. Some entries have multiple parens; strip them all.
const TRAILING_PAREN = /\s*\([^)]*\)\s*$/

const STRIPPABLE_SUFFIXES = [
  'City and Borough',
  'Census Area',
  'Municipality',
  'Municipio',
  'Borough',
  'Parish',
  'County',
] as const

export function parseFipsFile(content: string): {
  states: ParsedState[]
  counties: ParsedCounty[]
} {
  const lines = content.split(/\r?\n/)
  const states: ParsedState[] = []
  const counties: ParsedCounty[] = []

  let section: 'header' | 'states' | 'between' | 'counties' = 'header'

  for (const line of lines) {
    if (/state-level\s+place/i.test(line)) {
      section = 'states'
      continue
    }
    if (/county-level\s+place/i.test(line)) {
      section = 'counties'
      continue
    }
    if (/^\s*-+\s+-+\s*$/.test(line)) continue // dashed separator

    if (section === 'states') {
      const m = STATE_LINE.exec(line)
      if (m && m[1] && m[2]) {
        states.push({ fips: m[1], rawName: m[2].trim() })
      }
      continue
    }

    if (section === 'counties') {
      const m = COUNTY_LINE.exec(line)
      if (!m || !m[1] || !m[2]) continue
      const fips = m[1]
      // State rollup row: '01000 Alabama'. Skip — those go through the
      // states section.
      if (fips.endsWith('000')) continue

      let cleaned = m[2]
      while (TRAILING_PAREN.test(cleaned)) {
        cleaned = cleaned.replace(TRAILING_PAREN, '')
      }
      cleaned = cleaned.trim()
      if (!cleaned) continue

      counties.push({
        fips,
        stateFips: fips.slice(0, 2),
        rawName: m[2].trim(),
        countyName: cleaned,
        slug: countySlug(cleaned),
      })
    }
  }

  return { states, counties }
}

export function countySlug(name: string): string {
  let s = name.trim()
  for (const suffix of STRIPPABLE_SUFFIXES) {
    const re = new RegExp(`\\s+${escapeRegExp(suffix)}$`, 'i')
    if (re.test(s)) {
      s = s.replace(re, '')
      break
    }
  }
  // 'Baltimore city' / 'Carson City' / 'Suffolk city' — keep the marker.
  // (After the County/Borough strip above, anything still ending in
  // ' city' or ' City' falls through and gets slugified intact.)
  return slugify(s)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
