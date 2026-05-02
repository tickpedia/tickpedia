// Mode 3: CDC monthly national counts (year × month × disease).
//
// Two acceptable layouts:
//   - Long: Year, Month, Disease, Count
//   - Wide: Year, Month, then one column per disease
// Wide is auto-detected and flattened on the fly.

import { connect } from '@tickpedia/db'
import { ingestDiseaseMonth, type DiseaseMonthRow, type IngestSummary } from '@tickpedia/db/ingest'
import { parseSpreadsheetInput } from '../../../../lib/xlsx'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import BasicImportForm from '../../../components/BasicImportForm'

async function importAction(
  _prev: IngestSummary | null,
  form: FormData,
): Promise<IngestSummary | null> {
  'use server'
  const sheet = await parseSpreadsheetInput(form)
  if (!sheet) return null
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

      <section className="card">
        <h3>Expected shape — long format</h3>
        <p style={{ marginTop: 0 }}>One row per (year, month, disease).</p>
        <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th align="left">Column</th>
              <th align="left">What goes in it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Year</code></td>
              <td>4-digit year.</td>
            </tr>
            <tr>
              <td><code>Month</code></td>
              <td>1–12.</td>
            </tr>
            <tr>
              <td><code>Disease</code></td>
              <td>
                Display name. Must match a disease in <code>seeds/diseases.ts</code> by slug,
                alias, or display name.
              </td>
            </tr>
            <tr>
              <td><code>Count</code></td>
              <td>Integer. Blank/non-numeric is treated as missing and skipped.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>Expected shape — wide format (auto-detected)</h3>
        <p style={{ marginTop: 0 }}>
          If <code>Disease</code> and <code>Count</code> aren&apos;t present, the page assumes
          wide format and flattens it. One row per (year, month).
        </p>
        <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th align="left">Column</th>
              <th align="left">What goes in it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Year</code></td>
              <td>4-digit year.</td>
            </tr>
            <tr>
              <td><code>Month</code></td>
              <td>1–12.</td>
            </tr>
            <tr>
              <td><em>any other column</em></td>
              <td>
                Treated as a disease — header is the disease name, cell is the count. Blank
                cells are skipped (not stored as 0).
              </td>
            </tr>
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          <strong>Idempotent on</strong>{' '}
          <code>(year, month, disease_id)</code>. No example file ships with the repo —
          monthly tables come from CDC&apos;s national notifiable diseases summary, separate
          from the tick-borne disease report.
        </p>
      </section>

      <BasicImportForm action={importAction} />
    </div>
  )
}
