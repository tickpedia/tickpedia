// Mode 1: CDC wide-format county-year disease counts.
//
// Expects an xlsx with header row containing: State, County, FIPS, then
// one column per disease (matched by alias). One xlsx ships one year —
// the year is entered by the admin in the form below the file picker.
//
// Idempotent: natural key (county_fips, disease_id, year) means
// importing the same year over and over only updates `count` and bumps
// `updated_at`.

import { connect, schema } from '@tickpedia/db'
import { ingestCdcCountyYear } from '@tickpedia/db/ingest'
import type { RawCountyRow, IngestSummary } from '@tickpedia/db/ingest'
import { parseSpreadsheetInput } from '../../../../lib/xlsx'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import ImportForm from './ImportForm'

async function importAction(_prev: IngestSummary | null, form: FormData): Promise<IngestSummary | null> {
  'use server'
  const year = Number(form.get('year'))
  if (!Number.isInteger(year)) return null

  const sheet = await parseSpreadsheetInput(form)
  if (!sheet) return null

  // Coerce every cell to string for rowToLong's RawCountyRow shape.
  const rows: RawCountyRow[] = sheet.rows.map((r) => {
    const out: RawCountyRow = { State: '', County: '', FIPS: '' }
    for (const [k, v] of Object.entries(r)) {
      out[k] = v === null || v === undefined ? '' : String(v)
    }
    return out
  })

  const db = connect(process.env.DATABASE_URL)
  const summary = await ingestCdcCountyYear(db, { rows, year })
  if (summary.applied > 0) await notifySemilayer('diseaseCountyYear')
  return summary
}

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)
  const recent = await db
    .select({
      year: schema.diseaseCountyYear.year,
      count: schema.diseaseCountyYear.count,
      updatedAt: schema.diseaseCountyYear.updatedAt,
    })
    .from(schema.diseaseCountyYear)
    .orderBy(schema.diseaseCountyYear.updatedAt)
    .limit(1)

  return (
    <div>
      <h1>Import: CDC disease counts (county × year)</h1>
      <p className="muted">
        Wide-format xlsx with columns <code>State, County, FIPS, &lt;disease&gt;…</code>. The
        year applies to the whole sheet. Re-importing the same year safely updates the counts
        in place.
      </p>

      <section className="card">
        <h3>Expected shape</h3>
        <p style={{ marginTop: 0 }}>
          One row per county. The first three columns describe the county; every other column
          is treated as a disease.
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
              <td><code>State</code></td>
              <td>Full state name, e.g. <code>Alabama</code>. Display only.</td>
            </tr>
            <tr>
              <td><code>County</code></td>
              <td>County name, e.g. <code>Autauga</code>. Display only.</td>
            </tr>
            <tr>
              <td><code>FIPS</code></td>
              <td>
                5-digit FIPS, e.g. <code>01001</code>. Leading zeros required — if your file
                has them as numbers, the parser pads back to 5.
              </td>
            </tr>
            <tr>
              <td><em>any other column</em></td>
              <td>
                Treated as a disease. The header must match a disease in{' '}
                <code>seeds/diseases.ts</code> by slug, alias, or display name (case + spacing
                insensitive). Cell value is an integer count. CDC suppressions{' '}
                <code>&lt;5</code> and <code>*</code> are dropped (not stored as 0).
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Year</strong>: one value applies to the whole sheet — pick it in the form.
          <br />
          <strong>Idempotent on</strong>{' '}
          <code>(county_fips, disease_id, year)</code> — re-import freely.
          <br />
          <strong>Example file</strong>: <code>AllTBD2022_Public.xlsx</code> from{' '}
          <a
            href="https://www.cdc.gov/ticks/data-research/facts-stats/"
            target="_blank"
            rel="noreferrer"
          >
            cdc.gov/ticks
          </a>
          .
        </p>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Errors usually mean an unknown disease column (add to{' '}
          <code>seeds/diseases.ts</code> + reseed) or a county FIPS the seed doesn&apos;t cover
          (add to <code>seeds/locations/extra-counties.ts</code>). Bogus CDC FIPS (e.g.{' '}
          <code>11031</code>) are silently skipped.
        </p>
      </section>

      <ImportForm action={importAction} />

      {recent.length === 0 ? null : (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Last import touched year {recent[0]?.year}.
        </p>
      )}
    </div>
  )
}
