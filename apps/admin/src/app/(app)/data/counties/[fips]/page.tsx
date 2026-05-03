// Per-county drilldown.
//
// Keyed by the 5-char county FIPS (canonical, unique nationwide — no
// need for a state slug in the URL). Renders the full surveillance
// timeline for a single county:
//
//   1. Tick presence — every (tick × year) row in the county.
//   2. Pathogen presence — every (pathogen × year) row in the county.
//   3. Disease cases — pivoted (year × disease) so seasonality and
//      year-over-year shape are obvious in one glance.
//
// All four queries run in parallel. The county lookup misses 404s.

import Link from 'next/link'
import type { Route } from 'next'
import { notFound } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'

interface TickRow {
  tickSlug: string
  tickName: string
  scientificName: string
  year: number
  status: 'established' | 'reported' | 'no_records'
  source: string | null
}

interface PathogenRow {
  pathogenSlug: string
  pathogenName: string
  scientificName: string
  year: number
  status: 'present' | 'no_records'
  source: string | null
}

interface DiseaseRow {
  diseaseSlug: string
  diseaseName: string
  year: number
  count: number
}

export default async function CountyPage({
  params,
}: {
  params: Promise<{ fips: string }>
}) {
  const { fips } = await params
  const db = connect(process.env.DATABASE_URL)

  const countyJoin = await db
    .select({
      fips: schema.counties.fips,
      slug: schema.counties.slug,
      countyName: schema.counties.countyName,
      latitude: schema.counties.latitude,
      longitude: schema.counties.longitude,
      stateFips: schema.states.fips,
      stateName: schema.states.name,
      stateCode: schema.states.code,
      stateSlug: schema.states.slug,
    })
    .from(schema.counties)
    .innerJoin(schema.states, eq(schema.states.fips, schema.counties.stateFips))
    .where(eq(schema.counties.fips, fips))
    .limit(1)

  const county = countyJoin[0]
  if (!county) notFound()

  const [tickRowsRaw, pathogenRowsRaw, diseaseRowsRaw] = await Promise.all([
    db.execute(sql`
      select
        t.slug             as "tickSlug",
        t.common_name      as "tickName",
        t.scientific_name  as "scientificName",
        tc.year            as year,
        tc.status          as status,
        tc.source          as source
      from tick_county tc
      join ticks t on t.id = tc.tick_id
      where tc.county_fips = ${fips}
      order by tc.year desc, t.common_name
    `),

    db.execute(sql`
      select
        p.slug             as "pathogenSlug",
        p.display_name     as "pathogenName",
        p.scientific_name  as "scientificName",
        pc.year            as year,
        pc.status          as status,
        pc.source          as source
      from pathogen_county pc
      join pathogens p on p.id = pc.pathogen_id
      where pc.county_fips = ${fips}
      order by pc.year desc, p.display_name
    `),

    db.execute(sql`
      select
        d.slug          as "diseaseSlug",
        d.display_name  as "diseaseName",
        dcy.year        as year,
        dcy.count       as count
      from disease_county_year dcy
      join diseases d on d.id = dcy.disease_id
      where dcy.county_fips = ${fips}
      order by dcy.year desc, d.display_name
    `),
  ])

  const tickRows = unwrap<TickRow>(tickRowsRaw)
  const pathogenRows = unwrap<PathogenRow>(pathogenRowsRaw)
  const diseaseRows = unwrap<DiseaseRow>(diseaseRowsRaw)

  // Latest-status-per-tick for the header card.
  const latestStatusByTick = new Map<string, TickRow>()
  for (const r of tickRows) {
    const seen = latestStatusByTick.get(r.tickSlug)
    if (!seen || r.year > seen.year) latestStatusByTick.set(r.tickSlug, r)
  }
  const ticksEstablished = Array.from(latestStatusByTick.values()).filter(
    (r) => r.status === 'established',
  ).length
  const pathogensPresent = new Set(
    pathogenRows.filter((r) => r.status === 'present').map((r) => r.pathogenSlug),
  ).size
  const totalCases = diseaseRows.reduce((s, r) => s + r.count, 0)

  // Pivot disease rows into a (year × disease) matrix.
  const yearKeys = Array.from(new Set(diseaseRows.map((r) => r.year))).sort((a, b) => b - a)
  const diseaseTotals = new Map<string, { name: string; total: number }>()
  for (const r of diseaseRows) {
    const seen = diseaseTotals.get(r.diseaseSlug)
    if (seen) seen.total += r.count
    else diseaseTotals.set(r.diseaseSlug, { name: r.diseaseName, total: r.count })
  }
  const diseaseOrder = Array.from(diseaseTotals.entries()).sort(
    (a, b) => b[1].total - a[1].total,
  )
  const cell = new Map<string, number>()
  for (const r of diseaseRows) cell.set(`${r.year}|${r.diseaseSlug}`, r.count)

  // Year span across any of the three tables.
  const allYears = [
    ...tickRows.map((r) => r.year),
    ...pathogenRows.map((r) => r.year),
    ...diseaseRows.map((r) => r.year),
  ]
  const yearSpan =
    allYears.length === 0
      ? null
      : { first: Math.min(...allYears), latest: Math.max(...allYears) }

  return (
    <div>
      <p className="muted" style={{ marginBottom: '0.25rem' }}>
        <Link href={'/data' as Route}>← All states</Link>
        {' · '}
        <Link href={`/data/states/${county.stateSlug}` as Route}>{county.stateName}</Link>
      </p>
      <h1>
        {county.countyName} <span className="muted">{county.stateCode}</span>
      </h1>

      <div className="card-grid">
        <Stat label="FIPS" value={county.fips} />
        <Stat
          label="Coordinates"
          value={
            county.latitude != null && county.longitude != null
              ? `${county.latitude.toFixed(2)}, ${county.longitude.toFixed(2)}`
              : '—'
          }
        />
        <Stat label="Ticks established" value={ticksEstablished} />
        <Stat label="Pathogens present" value={pathogensPresent} />
        <Stat label="Σ disease cases" value={totalCases} />
        <Stat
          label="Years"
          value={
            yearSpan
              ? yearSpan.first === yearSpan.latest
                ? String(yearSpan.first)
                : `${yearSpan.first} – ${yearSpan.latest}`
              : '—'
          }
        />
      </div>

      <div className="card">
        <h3>Tick presence (every survey year)</h3>
        {tickRows.length === 0 ? (
          <p className="muted">No tick presence rows for this county.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tick</th>
                <th>Year</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {tickRows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <strong>{r.tickName}</strong>{' '}
                    <span className="muted" style={{ fontStyle: 'italic' }}>
                      {r.scientificName}
                    </span>
                  </td>
                  <td>{r.year}</td>
                  <td>
                    <span
                      className={
                        'pill ' +
                        (r.status === 'established'
                          ? 'success'
                          : r.status === 'reported'
                            ? 'warn'
                            : '')
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="muted">{r.source ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Pathogen presence</h3>
        {pathogenRows.length === 0 ? (
          <p className="muted">No pathogen surveillance rows for this county.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pathogen</th>
                <th>Year</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {pathogenRows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <strong>{r.pathogenName}</strong>{' '}
                    <span className="muted" style={{ fontStyle: 'italic' }}>
                      {r.scientificName}
                    </span>
                  </td>
                  <td>{r.year}</td>
                  <td>
                    <span className={'pill ' + (r.status === 'present' ? 'success' : '')}>
                      {r.status}
                    </span>
                  </td>
                  <td className="muted">{r.source ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Disease cases by year × disease</h3>
        {diseaseRows.length === 0 ? (
          <p className="muted">No disease counts for this county.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  {diseaseOrder.map(([slug, info]) => (
                    <th key={slug} style={{ textAlign: 'right' }}>
                      {info.name}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right' }}>Σ</th>
                </tr>
              </thead>
              <tbody>
                {yearKeys.map((y) => {
                  let rowTotal = 0
                  return (
                    <tr key={y}>
                      <td>
                        <strong>{y}</strong>
                      </td>
                      {diseaseOrder.map(([slug]) => {
                        const v = cell.get(`${y}|${slug}`) ?? 0
                        rowTotal += v
                        return (
                          <td
                            key={slug}
                            style={{ textAlign: 'right' }}
                            className={v === 0 ? 'muted' : ''}
                          >
                            {v === 0 ? '—' : v.toLocaleString()}
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'right' }}>
                        <strong>{rowTotal.toLocaleString()}</strong>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  )
}

function unwrap<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object' && 'rows' in raw) {
    return (raw as { rows: T[] }).rows
  }
  return []
}
