// Mode 3: CDC monthly national counts (year × month × disease).
//
// Two acceptable layouts:
//   - Long: Year, Month, Disease, Count
//   - Wide: Year, Month, then one column per disease
// Wide is auto-detected and flattened on the fly.

import { connect } from '@tickpedia/db'
import { ingestDiseaseMonth, type DiseaseMonthRow, type IngestSummary } from '@tickpedia/db/ingest'
import { parseXlsx } from '../../../../lib/xlsx'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import BasicImportForm from '../../../components/BasicImportForm'

async function importAction(
  _prev: IngestSummary | null,
  form: FormData,
): Promise<IngestSummary | null> {
  'use server'
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) return null

  const buf = await file.arrayBuffer()
  const sheet = parseXlsx(buf)
  const headers = sheet.headers.map((h) => h.toString())

  const findHeader = (re: RegExp): string | null => headers.find((h) => re.test(h)) ?? null
  const yearCol = findHeader(/^year$/i)
  const monthCol = findHeader(/^month$/i)
  const diseaseCol = findHeader(/^disease$/i)
  const countCol = findHeader(/^count$/i)

  const rows: DiseaseMonthRow[] = []
  if (yearCol && monthCol && diseaseCol && countCol) {
    // Long format.
    for (const r of sheet.rows) {
      const year = Number(r[yearCol])
      const month = Number(r[monthCol])
      const diseaseName = String(r[diseaseCol] ?? '').trim()
      const count = Number(r[countCol])
      if (!diseaseName) continue
      rows.push({ year, month, diseaseName, count: Number.isFinite(count) ? count : 0 })
    }
  } else if (yearCol && monthCol) {
    // Wide: every non-(year, month) column is a disease.
    const diseaseCols = headers.filter((h) => h !== yearCol && h !== monthCol)
    for (const r of sheet.rows) {
      const year = Number(r[yearCol])
      const month = Number(r[monthCol])
      for (const dc of diseaseCols) {
        const v = r[dc]
        if (v === null || v === '' || v === undefined) continue
        const count = Number(v)
        if (!Number.isFinite(count)) continue
        rows.push({ year, month, diseaseName: dc, count })
      }
    }
  } else {
    return {
      applied: 0,
      skipped: 0,
      errors: [
        {
          row: 0,
          reason:
            'Could not detect Year / Month columns. Headers: ' + headers.join(', '),
        },
      ],
    }
  }

  const db = connect(process.env.DATABASE_URL)
  const summary = await ingestDiseaseMonth(db, rows)
  if (summary.applied > 0) await notifySemilayer('diseaseMonth')
  return summary
}

export default function Page() {
  return (
    <div>
      <h1>Import: CDC monthly counts (national)</h1>
      <p className="muted">
        Long-format (Year, Month, Disease, Count) or wide-format (Year, Month, then one column
        per disease). Idempotent on (year, month, disease) — re-importing the same period
        updates counts in place.
      </p>
      <BasicImportForm action={importAction} />
    </div>
  )
}
