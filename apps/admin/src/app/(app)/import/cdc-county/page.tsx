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
import { parseXlsx } from '../../../../lib/xlsx'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import ImportForm from './ImportForm'

async function importAction(_prev: IngestSummary | null, form: FormData): Promise<IngestSummary | null> {
  'use server'
  const file = form.get('file')
  const year = Number(form.get('year'))
  if (!(file instanceof File) || file.size === 0) return null
  if (!Number.isInteger(year)) return null

  const buf = await file.arrayBuffer()
  const sheet = parseXlsx(buf)

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

      <ImportForm action={importAction} />

      {recent.length === 0 ? null : (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Last import touched year {recent[0]?.year}.
        </p>
      )}
    </div>
  )
}
