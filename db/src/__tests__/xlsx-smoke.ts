// Manual smoke test — point at the unstructured-data/data folder and
// run:
//   tsx --env-file=../.env src/__tests__/xlsx-smoke.ts
//
// Verifies that every cleaned per-year file under unstructured-data/data
// parses + ingests idempotently against the LOCAL Postgres. Not part of
// `vitest run` because it touches the database.
//
// Layout (see unstructured-data/manifest.md):
//   data/disease_county_year/cumulative_2019-2022.xlsx        → ingestCdcCountyYear
//   data/tick_presence/amblyomma_americanum/2024.xlsx         → ingestTickCounty (single)
//   data/tick_presence/ixodes/2025.xlsx                       → ingestTickCounty (multi)
//   data/tick_pathogens/ixodes/2025.xlsx                      → ingestPathogenCounty
//   data/lyme_county_year/lyme_2000-2023.csv                  → ingestLymeCountyYear
//   data/national_monthly/by_month.csv                        → ingestDiseaseMonth

import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { connect } from '../connect.js'
import {
  ingestCdcCountyYear,
  ingestTickCounty,
  parseSingleTickRows,
  parseMultiTickRows,
  ingestLymeCountyYear,
  ingestPathogenCounty,
  parsePathogenRows,
  ingestDiseaseMonth,
  parseMonth,
  type RawCountyRow,
  type SingleTickRawRow,
  type MultiTickColumnPair,
  type LymeRawRow,
  type PathogenColumnPair,
  type DiseaseMonthRow,
} from '../ingest/index.js'
import { schema } from '../index.js'

const DATA_DIR = resolve(import.meta.dirname, '..', '..', '..', '..', 'unstructured-data', 'data')

function readSheet(file: string, opts: { headerRow?: number; sheetName?: string } = {}) {
  const buf = readFileSync(resolve(DATA_DIR, file))
  const wb = XLSX.read(buf, { cellDates: true })
  const sheetName = opts.sheetName ?? wb.SheetNames.find((n) => (wb.Sheets[n]?.['!ref'] ?? '').length > 0)!
  const ws = wb.Sheets[sheetName]!
  if (opts.headerRow !== undefined && opts.headerRow > 0) {
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
    const headers = (aoa[opts.headerRow] ?? []).map((h) => String(h ?? '').trim())
    const rows: Record<string, unknown>[] = []
    for (let i = opts.headerRow + 1; i < aoa.length; i++) {
      const row = aoa[i] ?? []
      const obj: Record<string, unknown> = {}
      for (let c = 0; c < headers.length; c++) {
        const k = headers[c]
        if (!k) continue
        obj[k] = row[c] ?? null
      }
      rows.push(obj)
    }
    return { headers, rows, sheetName }
  }
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
  return { headers: Object.keys(json[0] ?? {}), rows: json, sheetName }
}

function readCsv(file: string) {
  // SheetJS handles CSVs the same way it handles xlsx; we route through
  // it so per-row coercion (numbers stay numbers, blanks → null) matches
  // the admin path exactly.
  const buf = readFileSync(resolve(DATA_DIR, file))
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]!
  const ws = wb.Sheets[sheetName]!
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
  return { headers: Object.keys(json[0] ?? {}), rows: json, sheetName }
}

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL required')
const db = connect(url)

console.log('─── 1. disease_county_year/cumulative_2019-2022.xlsx (CDC AllTBD) ───')
{
  const sheet = readSheet('disease_county_year/cumulative_2019-2022.xlsx')
  console.log('  headers:', sheet.headers.join(', '))
  const rows: RawCountyRow[] = sheet.rows.map((r) => {
    const out: RawCountyRow = { State: '', County: '', FIPS: '' }
    for (const [k, v] of Object.entries(r)) out[k] = v == null ? '' : String(v)
    return out
  })
  console.log(`  ${rows.length} rows`)
  const summary = await ingestCdcCountyYear(db, { rows, year: 2022 })
  console.log('  applied:', summary.applied, 'errors:', summary.errors.length)
  if (summary.errors.length > 0) console.log('  first 3 errors:', summary.errors.slice(0, 3))
}

console.log('\n─── 2. tick_presence/amblyomma_americanum/2024.xlsx (single-tick) ───')
{
  const sheet = readSheet('tick_presence/amblyomma_americanum/2024.xlsx')
  console.log('  headers:', sheet.headers.join(', '))
  const rows: SingleTickRawRow[] = sheet.rows.map((r) => ({
    FIPS: r['FIPS'],
    State: r['State'],
    County: r['County'],
    Status: r['County Status of A. americanum'],
    Source: r['Source'],
    SourceComments: r['Source Comments'],
  }))
  const { rows: parsed, errors: parseErrors } = parseSingleTickRows(rows, {
    tickSlug: 'lone-star-tick',
    year: 2024,
  })
  console.log(`  parsed: ${parsed.length}, parse errors: ${parseErrors.length}`)
  const summary = await ingestTickCounty(db, { rows: parsed })
  console.log('  applied:', summary.applied, 'skipped:', summary.skipped, 'errors:', summary.errors.length)
}

console.log('\n─── 3. tick_presence/ixodes/2025.xlsx (multi-tick) ───')
{
  const sheet = readSheet('tick_presence/ixodes/2025.xlsx')
  console.log('  headers:', sheet.headers.join(', '))
  const ticksList = await db
    .select({ slug: schema.ticks.slug, scientificName: schema.ticks.scientificName })
    .from(schema.ticks)
  const fipsColumn = sheet.headers.find((h) => /fips/i.test(h)) ?? 'FIPSCode'
  const statusCols = sheet.headers.filter((h) => /status/i.test(h))
  const sourceCols = sheet.headers.filter((h) => /source/i.test(h))
  const pairs: MultiTickColumnPair[] = []
  for (const statusCol of statusCols) {
    const prefix = statusCol.replace(/_(county_?status|status)$/i, '')
    const matchingSource = sourceCols.find(
      (c) => c.toLowerCase().startsWith(prefix.toLowerCase()) && /source/i.test(c),
    )
    if (!matchingSource) continue
    const tick = ticksList.find((t) => {
      const norm = t.scientificName.toLowerCase().replace(/\s+/g, '_')
      return prefix.toLowerCase() === norm
    })
    if (!tick) continue
    pairs.push({ tickSlug: tick.slug, statusColumn: statusCol, sourceColumn: matchingSource })
  }
  console.log('  detected pairs:', pairs)
  const { rows: parsed, errors: parseErrors } = parseMultiTickRows(sheet.rows, {
    fipsColumn,
    year: 2025,
    ticks: pairs,
  })
  console.log(`  parsed: ${parsed.length}, parse errors: ${parseErrors.length}`)
  const summary = await ingestTickCounty(db, { rows: parsed })
  console.log('  applied:', summary.applied, 'skipped:', summary.skipped, 'errors:', summary.errors.length)
}

console.log('\n─── 4. tick_pathogens/ixodes/2025.xlsx (multi-pathogen) ───')
{
  const sheet = readSheet('tick_pathogens/ixodes/2025.xlsx')
  console.log('  headers:', sheet.headers.join(', '))
  const pathogensList = await db
    .select({
      slug: schema.pathogens.slug,
      scientificName: schema.pathogens.scientificName,
      aliases: schema.pathogens.aliases,
    })
    .from(schema.pathogens)
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const fipsColumn = sheet.headers.find((h) => /fips/i.test(h)) ?? 'FIPS_Code'
  const statusCols = sheet.headers.filter((h) => /status/i.test(h))
  const sourceCols = sheet.headers.filter((h) => /source/i.test(h))
  const pairs: PathogenColumnPair[] = []
  for (const statusCol of statusCols) {
    const prefix = statusCol.replace(/_(county_?status|status)$/i, '')
    const matchingSource = sourceCols.find(
      (c) => norm(c).startsWith(norm(prefix)) && /source/i.test(c),
    )
    if (!matchingSource) continue
    const normPrefix = norm(prefix)
    const pathogen = pathogensList.find((p) => {
      const ns = norm(p.scientificName)
      if (ns === normPrefix) return true
      if (ns.startsWith(normPrefix) || normPrefix.startsWith(ns)) return true
      const sluggedPrefix = prefix
        .toLowerCase()
        .replace(/_+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      return p.aliases.includes(sluggedPrefix)
    })
    if (!pathogen) continue
    pairs.push({ pathogenSlug: pathogen.slug, statusColumn: statusCol, sourceColumn: matchingSource })
  }
  console.log('  detected pairs:', pairs)
  const { rows: parsed, errors: parseErrors } = parsePathogenRows(sheet.rows, {
    fipsColumn,
    year: 2025,
    pathogens: pairs,
  })
  console.log(`  parsed: ${parsed.length}, parse errors: ${parseErrors.length}`)
  const summary = await ingestPathogenCounty(db, { rows: parsed })
  console.log('  applied:', summary.applied, 'skipped:', summary.skipped, 'errors:', summary.errors.length)
  if (summary.errors.length > 0) console.log('  first 3 errors:', summary.errors.slice(0, 3))
}

console.log('\n─── 5. lyme_county_year/lyme_2000-2023.csv (Lyme per-year) ───')
{
  const sheet = readCsv('lyme_county_year/lyme_2000-2023.csv')
  console.log('  headers:', sheet.headers.slice(0, 8).join(', '), `… (${sheet.headers.length} total)`)
  const rows: LymeRawRow[] = sheet.rows.map((r) => {
    const out: LymeRawRow = { stcode: '', ctycode: '' }
    for (const [k, v] of Object.entries(r)) out[k] = v
    return out
  })
  console.log(`  ${rows.length} rows`)
  const summary = await ingestLymeCountyYear(db, { rows })
  console.log('  applied:', summary.applied, 'skipped:', summary.skipped, 'errors:', summary.errors.length)
  if (summary.errors.length > 0) console.log('  first 3 errors:', summary.errors.slice(0, 3))
}

console.log('\n─── 6. national_monthly/by_month.csv (CDC monthly long format) ───')
{
  const sheet = readCsv('national_monthly/by_month.csv')
  console.log('  headers:', sheet.headers.join(', '))
  const yearCol = sheet.headers.find((h) => /^year$/i.test(h))!
  const monthCol = sheet.headers.find((h) => /^month$/i.test(h))!
  const diseaseCol = sheet.headers.find((h) => /^disease$/i.test(h))!
  const countCol = sheet.headers.find((h) => /^count$/i.test(h))!
  const rows: DiseaseMonthRow[] = []
  for (const r of sheet.rows) {
    const year = Number(r[yearCol])
    const month = parseMonth(r[monthCol])
    if (month === null) continue
    const diseaseName = String(r[diseaseCol] ?? '').trim()
    const count = Number(String(r[countCol] ?? '').replace(/,/g, ''))
    if (!diseaseName) continue
    rows.push({ year, month, diseaseName, count: Number.isFinite(count) ? count : 0 })
  }
  console.log(`  ${rows.length} rows`)
  const summary = await ingestDiseaseMonth(db, rows)
  console.log('  applied:', summary.applied, 'errors:', summary.errors.length)
  if (summary.errors.length > 0) console.log('  first 3 errors:', summary.errors.slice(0, 3))
}

console.log('\nAll smokes done.')
process.exit(0)
