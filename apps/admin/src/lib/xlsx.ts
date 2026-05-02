// Server-side xlsx parsing helper. Lives here (not in @tickpedia/db) so
// the db package stays narrow and the SheetJS dep doesn't follow into
// scrape jobs that just want the schema.
//
// `read` returns the first sheet's rows as an object array keyed by the
// header row. Numeric cells stay as numbers; string cells stay as
// strings; FIPS codes are normalized to strings with leading zeros
// downstream.

import * as XLSX from 'xlsx'

export interface ParsedSheet {
  headers: string[]
  rows: Record<string, unknown>[]
  sheetName: string
}

export function parseXlsx(buf: ArrayBuffer, sheetName?: string): ParsedSheet {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true })
  // Pick the first sheet that actually has rows of data — files like
  // the CDC Ixodes one have a "Data Use Agreement" preamble sheet
  // first.
  const candidates = sheetName ? [sheetName] : wb.SheetNames
  for (const name of candidates) {
    const ws = wb.Sheets[name]
    if (!ws) continue
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
      blankrows: false,
    })
    if (json.length === 0) continue
    const headers = Object.keys(json[0] ?? {})
    if (headers.length < 2) continue
    return { headers, rows: json, sheetName: name }
  }
  throw new Error(
    `No usable data sheet found in workbook${sheetName ? ` (looking for "${sheetName}")` : ''}`,
  )
}

// CDC's per-county tick file uses a banner row before the actual
// header. SheetJS's default sheet_to_json treats row 0 as the header.
// `parseWithHeaderRow` lets the caller skip n rows before reading.
export function parseXlsxAtRow(
  buf: ArrayBuffer,
  options: { headerRow: number; sheetName?: string },
): ParsedSheet {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true })
  const candidates = options.sheetName ? [options.sheetName] : wb.SheetNames
  for (const name of candidates) {
    const ws = wb.Sheets[name]
    if (!ws) continue
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: null,
      blankrows: false,
    })
    if (aoa.length <= options.headerRow) continue
    const headers = (aoa[options.headerRow] ?? []).map((h) => String(h ?? '').trim())
    if (headers.filter(Boolean).length < 2) continue
    const rows: Record<string, unknown>[] = []
    for (let i = options.headerRow + 1; i < aoa.length; i++) {
      const row = aoa[i] ?? []
      const obj: Record<string, unknown> = {}
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c]
        if (!key) continue
        obj[key] = row[c] ?? null
      }
      rows.push(obj)
    }
    return { headers: headers.filter(Boolean), rows, sheetName: name }
  }
  throw new Error('No usable data sheet found in workbook')
}
