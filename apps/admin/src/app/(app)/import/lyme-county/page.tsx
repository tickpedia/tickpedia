// Mode 4: CDC per-county per-year Lyme disease cases.
//
// One row per county; one column per year (Cases2001…cases2023). The
// year is encoded in the column header, not picked in the form — so this
// page omits the "Survey year" input entirely. Each row expands to up to
// 23 long entries on insert.
//
// Idempotent on (county_fips, disease_id, year). If the AllTBD cumulative
// import wrote 2019/2022 Lyme rows previously, this importer overwrites
// them with the per-year value (which is more accurate).

import { connect } from '@tickpedia/db'
import {
  ingestLymeCountyYear,
  type IngestSummary,
  type LymeRawRow,
} from '@tickpedia/db/ingest'
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

  const rows: LymeRawRow[] = sheet.rows.map((r) => {
    const out: LymeRawRow = { stcode: '', ctycode: '' }
    for (const [k, v] of Object.entries(r)) out[k] = v
    return out
  })

  const db = connect(process.env.DATABASE_URL)
  const summary = await ingestLymeCountyYear(db, { rows })
  if (summary.applied > 0) await notifySemilayer('diseaseCountyYear')
  return summary
}

export default function Page() {
  return (
    <div>
      <h1>Import: Lyme cases (county × year)</h1>
      <p className="muted">
        CDC&apos;s per-county per-year Lyme disease case CSV. One row per
        county, one column per year. Year is encoded in the column header
        (<code>Cases2001</code> &hellip; <code>cases2023</code>) — no year
        picker needed.
      </p>

      <section className="card">
        <h3>Expected shape</h3>
        <p style={{ marginTop: 0 }}>
          One row per county. The first five columns describe the county; every
          remaining column is treated as a year of Lyme case counts.
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
              <td><code>Ctyname</code>, <code>stname</code>, <code>ststatus</code></td>
              <td>Display only.</td>
            </tr>
            <tr>
              <td><code>stcode</code></td>
              <td>State FIPS (1–2 digit int — leading zero may be stripped).</td>
            </tr>
            <tr>
              <td><code>ctycode</code></td>
              <td>County FIPS suffix (1–3 digit int).</td>
            </tr>
            <tr>
              <td><code>Cases&lt;YEAR&gt;</code></td>
              <td>
                Integer count for that year. Header case is ignored
                (<code>Cases2018</code>, <code>cases2022</code> both work). CDC
                suppressions <code>&lt;5</code> and <code>*</code> are dropped
                (not stored as zero).
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Idempotent on</strong>{' '}
          <code>(county_fips, disease_id, year)</code>. Re-running overwrites
          counts for years the file covers — including any 2019/2022 rows
          previously written by the AllTBD cumulative import (per-year &gt;
          4-year cumulative). Disease is hard-coded to <code>lyme-disease</code>;
          this is a Lyme-only file.
        </p>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Example file: <code>lyme_2000-2023.csv</code> from{' '}
          <a
            href="https://www.cdc.gov/lyme/data-research/facts-stats/"
            target="_blank"
            rel="noreferrer"
          >
            cdc.gov/lyme
          </a>
          .
        </p>
      </section>

      <BasicImportForm action={importAction} />
    </div>
  )
}
