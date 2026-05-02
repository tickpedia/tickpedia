// Shared parser + result shape for the JSON / CSV admin imports.
//
// Inputs are either a file upload (.json / .csv) or a pasted blob in
// the textarea. The parser returns an array of records or an error
// describing the parse failure.

import * as xlsx from 'xlsx'

export interface ImportSummary {
  applied: number
  skipped: number
  errors: { row: number; reason: string }[]
}

export function emptySummary(): ImportSummary {
  return { applied: 0, skipped: 0, errors: [] }
}

// Pulls the JSON payload from either a `file` field or a `blob`
// textarea. Returns `null` if both are empty.
export async function readJsonInput(form: FormData): Promise<unknown[] | { error: string } | null> {
  const blobText = String(form.get('blob') ?? '').trim()
  const file = form.get('file')
  let raw: string | null = null
  if (file instanceof File && file.size > 0) {
    raw = await file.text()
  } else if (blobText) {
    raw = blobText
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      // Allow a single-object payload — wrap it.
      if (parsed && typeof parsed === 'object') return [parsed]
      return { error: 'Expected a JSON array of records.' }
    }
    return parsed
  } catch (err) {
    return { error: 'Invalid JSON: ' + (err as Error).message }
  }
}

// Pulls rows from either an xlsx/csv file upload or a pasted CSV blob.
// Returns the parsed `{ headers, rows }` shape (same as parseXlsx).
export async function readSpreadsheetInput(
  form: FormData,
  options: { headerRow?: number; sheetName?: string } = {},
): Promise<{ headers: string[]; rows: Record<string, unknown>[] } | { error: string } | null> {
  const blobText = String(form.get('blob') ?? '').trim()
  const file = form.get('file')
  const headerRow = options.headerRow ?? 0
  try {
    let wb: xlsx.WorkBook | null = null
    if (file instanceof File && file.size > 0) {
      const buf = await file.arrayBuffer()
      wb = xlsx.read(buf, { type: 'array' })
    } else if (blobText) {
      // CSV blob — let xlsx parse it as a string workbook.
      wb = xlsx.read(blobText, { type: 'string' })
    }
    if (!wb) return null
    const sheetName = options.sheetName ?? wb.SheetNames[0]
    if (!sheetName) return { error: 'No sheet found in the input.' }
    const ws = wb.Sheets[sheetName]
    if (!ws) return { error: `Sheet "${sheetName}" not found.` }

    const aoa = xlsx.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      blankrows: false,
      defval: null,
    })
    if (aoa.length <= headerRow) return { error: 'No data rows after the header row.' }

    const headers = (aoa[headerRow] ?? []).map((h) => String(h ?? '').trim())
    const rows: Record<string, unknown>[] = []
    for (let i = headerRow + 1; i < aoa.length; i++) {
      const arr = aoa[i] ?? []
      const obj: Record<string, unknown> = {}
      for (let c = 0; c < headers.length; c++) {
        const h = headers[c]
        if (!h) continue
        obj[h] = arr[c] ?? null
      }
      rows.push(obj)
    }
    return { headers, rows }
  } catch (err) {
    return { error: 'Parse failed: ' + (err as Error).message }
  }
}
