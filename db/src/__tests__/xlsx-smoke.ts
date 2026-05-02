// Manual smoke test — point at the unstructured-data/xlsx folder and run:
//   tsx --env-file=../.env src/__tests__/xlsx-smoke.ts
//
// Verifies that all three xlsx files in unstructured-data/xlsx parse +
// ingest idempotently against the LOCAL Postgres. Not part of
// `vitest run` because it touches the database.

import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { connect } from '../connect.js'
import {
  ingestCdcCountyYear,
  ingestTickCounty,
  parseSingleTickRows,
  parseMultiTickRows,
  type RawCountyRow,
  type SingleTickRawRow,
  type MultiTickColumnPair,
} from '../ingest/index.js'
import { schema } from '../index.js'

const DATA_DIR = resolve(import.meta.dirname, '..', '..', '..', '..', 'unstructured-data', 'xlsx')

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

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL required')
const db = connect(url)

console.log('─── 1. AllTBD2022_Public.xlsx (CDC county-year disease counts) ───')
{
  const sheet = readSheet('AllTBD2022_Public.xlsx')
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

console.log('\n─── 2. 2024-A.americanum-Surveillance-Map-Data.xlsx (single-tick presence) ───')
{
  const sheet = readSheet('2024-A.americanum-Surveillance-Map-Data.xlsx')
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
    tickSlug: 'amblyomma-americanum',
    year: 2024,
  })
  console.log(`  parsed: ${parsed.length}, parse errors: ${parseErrors.length}`)
  const summary = await ingestTickCounty(db, { rows: parsed })
  console.log('  applied:', summary.applied, 'skipped:', summary.skipped, 'errors:', summary.errors.length)
}

console.log('\n─── 3. Public_Use_Ixodes_County_Table_2026.xlsx (multi-tick presence) ───')
{
  const sheet = readSheet('Public_Use_Ixodes_County_Table_2026_03252026.xlsx', {
    sheetName: 'Ixodes records 2025',
    headerRow: 1,
  })
  console.log('  headers:', sheet.headers.join(', '))
  const ticksList = await db.select({ slug: schema.ticks.slug, scientificName: schema.ticks.scientificName }).from(schema.ticks)

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

console.log('\nAll three smokes done.')
process.exit(0)
