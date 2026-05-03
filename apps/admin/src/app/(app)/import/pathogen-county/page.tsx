// Mode 5: tick pathogen presence by county.
//
// Multi-pathogen layout — one xlsx ships several status+source column
// pairs (one per pathogen), e.g. the CDC "Public Use Ixodes Pathogens
// County Table" file with 7 pathogens side-by-side. The page auto-
// detects pairs the same way the multi-tick importer does: strip
// `_county_status` / `_status` from each status header, find the
// matching `<prefix>_data_source`, resolve the prefix to a pathogen via
// `pathogens.scientific_name` (case + underscores ignored) or its
// alias list.

import { connect, schema } from '@tickpedia/db'
import {
  ingestPathogenCounty,
  parsePathogenRows,
  type IngestSummary,
  type PathogenColumnPair,
} from '@tickpedia/db/ingest'
import { parseSpreadsheetInput } from '../../../../lib/xlsx'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import BasicImportForm from '../../../components/BasicImportForm'

async function importAction(
  _prev: IngestSummary | null,
  form: FormData,
): Promise<IngestSummary | null> {
  'use server'
  const year = Number(form.get('year'))
  const headerRow = Number(form.get('headerRow') ?? 0)
  const keepNoRecords = form.get('keepNoRecords') === 'on'
  if (!Number.isInteger(year)) return null

  const sheet = await parseSpreadsheetInput(form, { headerRow: headerRow > 0 ? headerRow : 0 })
  if (!sheet) return null

  const fipsColumn = sheet.headers.find((h) => /fips/i.test(h)) ?? 'FIPS_Code'
  const statusCols = sheet.headers.filter((h) => /status/i.test(h))
  const sourceCols = sheet.headers.filter((h) => /source|provenance/i.test(h))

  const pathogens = await connect(process.env.DATABASE_URL)
    .select({
      slug: schema.pathogens.slug,
      scientificName: schema.pathogens.scientificName,
      aliases: schema.pathogens.aliases,
    })
    .from(schema.pathogens)

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

  const pairs: PathogenColumnPair[] = []
  for (const statusCol of statusCols) {
    const prefix = statusCol.replace(/_(county_?status|status)$/i, '')
    const matchingSource = sourceCols.find(
      (c) => norm(c).startsWith(norm(prefix)) && /source/i.test(c),
    )
    if (!matchingSource) continue
    const normPrefix = norm(prefix)
    const pathogen = pathogens.find((p) => {
      if (norm(p.scientificName) === normPrefix) return true
      if (norm(p.scientificName).startsWith(normPrefix)) return true
      // CDC sometimes adds qualifiers to the column name (e.g.
      // "Anaplasma_phagocytophilum_human_active_variant"); match if
      // the column starts with the canonical name.
      if (normPrefix.startsWith(norm(p.scientificName))) return true
      // Fall back to alias slugs (slugify removes underscores → hyphens).
      const sluggedPrefix = prefix
        .toLowerCase()
        .replace(/_+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      return p.aliases.includes(sluggedPrefix)
    })
    if (!pathogen) continue
    pairs.push({ pathogenSlug: pathogen.slug, statusColumn: statusCol, sourceColumn: matchingSource })
  }

  if (pairs.length === 0) {
    return {
      applied: 0,
      skipped: 0,
      errors: [
        {
          row: 0,
          reason:
            'No pathogen column pairs detected. Headers found: ' +
            sheet.headers.join(', ') +
            '. Each pathogen needs a `<scientific_name>_County_Status` + matching `<scientific_name>_Data_Source` pair, and the pathogen must already exist in the pathogens table.',
        },
      ],
    }
  }

  const { rows: parsed, errors } = parsePathogenRows(sheet.rows, {
    fipsColumn,
    year,
    pathogens: pairs,
  })
  const db = connect(process.env.DATABASE_URL)
  const summary = await ingestPathogenCounty(db, { rows: parsed, keepNoRecords })
  summary.errors.unshift(...errors.map((e) => ({ row: e.row, reason: e.reason, raw: e.raw })))
  if (summary.applied > 0) await notifySemilayer('pathogenCounty')
  return summary
}

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)
  const knownPathogens = await db
    .select({
      slug: schema.pathogens.slug,
      displayName: schema.pathogens.displayName,
      scientificName: schema.pathogens.scientificName,
    })
    .from(schema.pathogens)
    .orderBy(schema.pathogens.displayName)

  return (
    <div>
      <h1>Import: tick pathogens (county × year)</h1>
      <p className="muted">
        CDC&apos;s &ldquo;Public Use Ixodes Pathogens County Table&rdquo; xlsx —
        per-county presence/no-records for each pathogen tested in host-seeking
        Ixodes ticks. Multi-pathogen layout; the page auto-detects column pairs.
      </p>

      <section className="card">
        <h3>Expected shape</h3>
        <p style={{ marginTop: 0 }}>
          One row per county. Multiple pathogens side-by-side, each as a
          status + source column pair. Pairs are matched by stripping{' '}
          <code>_County_Status</code> / <code>_status</code> off each status
          header and finding the matching <code>&lt;prefix&gt;_Data_Source</code>{' '}
          column.
        </p>
        <table style={{ width: '100%', fontSize: '0.85rem', marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th align="left">Column pattern</th>
              <th align="left">What goes in it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>FIPS_Code</code></td>
              <td>5-digit county FIPS.</td>
            </tr>
            <tr>
              <td><code>State</code>, <code>County</code></td>
              <td>Display only.</td>
            </tr>
            <tr>
              <td><code>Borrelia_burgdorferi_sensu_stricto_County_Status</code></td>
              <td>
                One of <code>Present</code> or <code>No records</code>. No-records
                rows are skipped unless you tick &ldquo;keep no-records&rdquo;.
              </td>
            </tr>
            <tr>
              <td><code>Borrelia_burgdorferi_sensu_stricto_Data_Source</code></td>
              <td>Citation string from the source file.</td>
            </tr>
            <tr>
              <td>… repeat the pair for each pathogen in the file</td>
              <td>
                Pathogen prefix matches <code>pathogens.scientific_name</code>{' '}
                (case + underscores ignored) or any entry in the pathogen&apos;s
                alias list.
              </td>
            </tr>
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Example file:{' '}
          <code>Public_Use_Ixodes_Pathogens_County_Table_2026_04292026.xlsx</code>
          {' '}(year <code>2025</code>). This page expects the file to have the
          headers on row 0 — the cleaned per-year files in
          <code> unstructured-data/data/tick_pathogens/ixodes/</code> already
          satisfy that. Set the header-row knob to <code>1</code> only if you
          ever upload a raw CDC archive with a banner row above the headers.
        </p>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          Pathogens currently seeded: {knownPathogens.map((p) => p.displayName).join(', ') || '(none)'}.
          To add a new pathogen, append to <code>db/src/seeds/pathogens.ts</code>{' '}
          and reseed.
        </p>
      </section>

      <p className="muted" style={{ fontSize: '0.85rem' }}>
        <strong>Idempotent on</strong> <code>(pathogen_id, county_fips, year)</code>.
        Re-importing the same year overwrites status + source.
      </p>

      <BasicImportForm action={importAction}>
        <div className="field">
          <label htmlFor="year">Survey year</label>
          <input
            id="year"
            name="year"
            type="number"
            defaultValue={new Date().getFullYear() - 1}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="headerRow">Header row index (advanced)</label>
          <input id="headerRow" name="headerRow" type="number" defaultValue={0} min={0} />
          <small className="muted">
            0 = first row is headers. Use 1 only if uploading a raw CDC archive
            with a banner above the headers.
          </small>
        </div>
        <div className="field">
          <label className="row" style={{ marginBottom: 0 }}>
            <input type="checkbox" name="keepNoRecords" style={{ width: 'auto' }} />
            <span>Keep &ldquo;No records&rdquo; rows (default: skip)</span>
          </label>
        </div>
      </BasicImportForm>
    </div>
  )
}
