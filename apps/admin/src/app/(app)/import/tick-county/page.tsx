// Mode 2: tick presence by county (CDC ArboNET style).
//
// Two sub-shapes:
//   - "single-tick": one xlsx ⇒ one tick. Admin picks the tick from a
//     dropdown. Header row has FIPS / State / County / Status / Source
//     / (optional) Source Comments.
//   - "multi-tick": one xlsx with several status+source column pairs
//     (e.g. the 2025 Ixodes file with both scapularis and pacificus).
//     The page auto-detects column pairs by looking for matching
//     suffixes like *_status / *_County_Status / *_county_status etc.

import { connect, schema } from '@tickpedia/db'
import {
  ingestTickCounty,
  parseSingleTickRows,
  parseMultiTickRows,
  type SingleTickRawRow,
  type MultiTickColumnPair,
  type IngestSummary,
} from '@tickpedia/db/ingest'
import { parseSpreadsheetInput } from '../../../../lib/xlsx'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import TickCountyImportForm from './TickCountyImportForm'

interface KnownTick {
  slug: string
  commonName: string
  scientificName: string
}

async function importAction(
  _prev: IngestSummary | null,
  form: FormData,
): Promise<IngestSummary | null> {
  'use server'
  const year = Number(form.get('year'))
  const mode = String(form.get('mode') ?? 'single')
  const headerRow = Number(form.get('headerRow') ?? 0)
  const tickSlug = String(form.get('tickSlug') ?? '')
  const keepNoRecords = form.get('keepNoRecords') === 'on'
  if (!Number.isInteger(year)) return null

  const sheet = await parseSpreadsheetInput(form, { headerRow: headerRow > 0 ? headerRow : 0 })
  if (!sheet) return null

  if (mode === 'single') {
    if (!tickSlug) return null
    // Map by header position — the file uses FIPS, State, County,
    // Status, Source, Source Comments. We normalize column lookup so
    // case/spacing differences in the header don't break the mapping.
    const rows: SingleTickRawRow[] = sheet.rows.map((r) => {
      const lookup = (...names: string[]) => {
        for (const n of names) {
          for (const k of Object.keys(r)) {
            if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === n.toLowerCase().replace(/[^a-z0-9]/g, '')) {
              return r[k]
            }
          }
        }
        return null
      }
      return {
        FIPS: lookup('FIPS', 'FIPSCode'),
        State: lookup('State'),
        County: lookup('County'),
        Status: lookup('Status', 'CountyStatus', 'CountyStatusOfAAmericanum'),
        Source: lookup('Source', 'DataSource'),
        SourceComments: lookup('SourceComments', 'Comments'),
      }
    })

    const { rows: parsed, errors } = parseSingleTickRows(rows, { tickSlug, year })
    const db = connect(process.env.DATABASE_URL)
    const summary = await ingestTickCounty(db, { rows: parsed, keepNoRecords })
    summary.errors.unshift(...errors.map((e) => ({ row: e.row, reason: e.reason, raw: e.raw })))
    if (summary.applied > 0) await notifySemilayer('tickCounty')
    return summary
  }

  // multi-tick: auto-detect *_status + *_data_source column pairs and
  // resolve each prefix to a tick by scientific name → slug.
  const fipsColumn = sheet.headers.find((h) => /fips/i.test(h)) ?? 'FIPS'
  const statusCols = sheet.headers.filter((h) => /status/i.test(h))
  const sourceCols = sheet.headers.filter((h) => /source|provenance/i.test(h))
  const ticks = await connect(process.env.DATABASE_URL)
    .select({ slug: schema.ticks.slug, scientificName: schema.ticks.scientificName })
    .from(schema.ticks)

  const pairs: MultiTickColumnPair[] = []
  for (const statusCol of statusCols) {
    // strip trailing "_status" / "_County_Status" / "_county_status" / etc.
    const prefix = statusCol.replace(/_(county_?status|status)$/i, '')
    const matchingSource = sourceCols.find(
      (c) => c.toLowerCase().startsWith(prefix.toLowerCase()) && /source/i.test(c),
    )
    if (!matchingSource) continue
    const tick = ticks.find((t) => {
      const norm = t.scientificName.toLowerCase().replace(/\s+/g, '_')
      return prefix.toLowerCase() === norm || prefix.toLowerCase() === norm.replace(/_/g, '')
    })
    if (!tick) continue
    pairs.push({ tickSlug: tick.slug, statusColumn: statusCol, sourceColumn: matchingSource })
  }

  if (pairs.length === 0) {
    return {
      applied: 0,
      skipped: 0,
      errors: [
        {
          row: 0,
          reason:
            'No tick column pairs detected. Headers found: ' +
            sheet.headers.join(', ') +
            '. Each tick needs a matching `<scientific_name>_status` and `<scientific_name>_data_source` pair, and the tick must already exist in the ticks table.',
        },
      ],
    }
  }

  const { rows: parsed, errors } = parseMultiTickRows(sheet.rows, {
    fipsColumn,
    year,
    ticks: pairs,
  })
  const db = connect(process.env.DATABASE_URL)
  const summary = await ingestTickCounty(db, { rows: parsed, keepNoRecords })
  summary.errors.unshift(...errors.map((e) => ({ row: e.row, reason: e.reason, raw: e.raw })))
  if (summary.applied > 0) await notifySemilayer('tickCounty')
  return summary
}

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)
  const ticks = await db
    .select({ slug: schema.ticks.slug, commonName: schema.ticks.commonName, scientificName: schema.ticks.scientificName })
    .from(schema.ticks)
    .orderBy(schema.ticks.commonName)

  const knownTicks: KnownTick[] = ticks
  return (
    <div>
      <h1>Import: tick presence (county × year)</h1>
      <p className="muted">
        CDC ArboNET-style xlsx of tick surveillance status by county.
        Pick <strong>single-tick</strong> for files that cover one species
        (e.g. the 2024 A. americanum file) and <strong>multi-tick</strong>{' '}
        for files with one column pair per tick (e.g. the 2025 Ixodes file).
      </p>
      <TickCountyImportForm action={importAction} ticks={knownTicks} />
    </div>
  )
}
