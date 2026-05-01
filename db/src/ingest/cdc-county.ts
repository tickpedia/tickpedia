// Wide → long converter for CDC's per-county annual surveillance file.
//
// Input rows look like:
//   { State: 'Alabama', County: 'Autauga', FIPS: '01001',
//     'Lyme disease': '1', 'Tularemia': '0', 'Babesiosis': '0', ... }
//
// Output rows are one count per (county, disease, year):
//   { countyFips: '01001', diseaseSlug: 'lyme-disease', year: 2023, count: 1 }
//
// We don't fetch the file here — that's a job for a scraper. This
// module is pure transform + normalize so it's trivially testable.

import { slugify } from '../normalize.js'

export interface RawCountyRow {
  State: string
  County: string
  FIPS: string
  [diseaseColumn: string]: string
}

export interface CountyDiseaseCount {
  countyFips: string
  stateFips: string
  stateName: string
  countyName: string
  diseaseSlug: string
  rawDiseaseColumn: string
  year: number
  count: number
}

const NON_DISEASE_COLUMNS = new Set(['state', 'county', 'fips'])

export function rowToLong(row: RawCountyRow, year: number): CountyDiseaseCount[] {
  if (!row.FIPS || row.FIPS.length < 5) {
    throw new Error(`Invalid FIPS in row: ${JSON.stringify(row)}`)
  }
  const fips = row.FIPS.padStart(5, '0').slice(-5)
  const stateFips = fips.slice(0, 2)

  const out: CountyDiseaseCount[] = []
  for (const [col, raw] of Object.entries(row)) {
    if (NON_DISEASE_COLUMNS.has(col.toLowerCase())) continue
    const count = parseCount(raw)
    if (count === null) continue
    out.push({
      countyFips: fips,
      stateFips,
      stateName: row.State,
      countyName: row.County,
      diseaseSlug: slugify(col),
      rawDiseaseColumn: col,
      year,
      count,
    })
  }
  return out
}

function parseCount(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  // CDC sometimes uses '<5' or '*' for suppressed cells. Treat as null;
  // the caller decides whether to skip or store as a sentinel.
  if (raw.startsWith('<') || raw === '*') return null
  const n = Number(raw.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}
