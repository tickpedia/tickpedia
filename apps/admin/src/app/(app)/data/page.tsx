// State-level overview of all imported location data. Each state shows
// county count + the surveillance rows attached to its counties so an
// admin can spot gaps ("South Dakota has no tick presence rows yet").
//
// The query is one SQL trip with subselects rather than 50 round-trips
// per state; works fine for ~50 states + a few thousand counties.

import Link from 'next/link'
import type { Route } from 'next'
import { sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'

interface StateRow {
  fips: string
  code: string
  slug: string
  name: string
  counties: number
  tickRows: number
  diseaseRows: number
  diseaseCount: number
  latestYear: number | null
}

export default async function DataIndex() {
  const db = connect(process.env.DATABASE_URL)
  const rows = (await db.execute(sql`
    select
      s.fips,
      s.code,
      s.slug,
      s.name,
      (select count(*)::int from counties c where c.state_fips = s.fips) as counties,
      (select count(*)::int from tick_county tc
         join counties c on c.fips = tc.county_fips
        where c.state_fips = s.fips) as "tickRows",
      (select count(*)::int from disease_county_year dcy
         join counties c on c.fips = dcy.county_fips
        where c.state_fips = s.fips) as "diseaseRows",
      (select coalesce(sum(dcy.count), 0)::int from disease_county_year dcy
         join counties c on c.fips = dcy.county_fips
        where c.state_fips = s.fips) as "diseaseCount",
      (select max(dcy.year) from disease_county_year dcy
         join counties c on c.fips = dcy.county_fips
        where c.state_fips = s.fips) as "latestYear"
    from states s
    order by s.name
  `)) as unknown as { rows: StateRow[] } | StateRow[]

  // Drizzle returns shape varies by driver — pg returns { rows }, neon
  // returns the array directly.
  const list: StateRow[] = Array.isArray(rows) ? rows : rows.rows

  const totals = list.reduce(
    (acc, r) => {
      acc.counties += r.counties
      acc.tickRows += r.tickRows
      acc.diseaseRows += r.diseaseRows
      acc.diseaseCount += r.diseaseCount
      return acc
    },
    { counties: 0, tickRows: 0, diseaseRows: 0, diseaseCount: 0 },
  )

  // Quick sanity stat: how many tick × county × year rows live in the
  // tick_county table outside of the state breakdown? (Should match
  // sum.) We pull it once for the dashboard cards.
  const [{ stateRows = 0 } = { stateRows: 0 }] = await db
    .select({ stateRows: sql<number>`count(*)::int` })
    .from(schema.tickState)

  return (
    <div>
      <h1>Location data</h1>
      <p className="muted">
        Geography rollup. Click into a state to see counties, tick presence by year, and disease
        breakdowns.
      </p>

      <div className="card-grid">
        <Stat label="States" value={list.length} />
        <Stat label="Counties" value={totals.counties} />
        <Stat label="Tick × county × year" value={totals.tickRows} />
        <Stat label="Disease × county × year" value={totals.diseaseRows} />
        <Stat label="Sum disease cases" value={totals.diseaseCount} />
        <Stat label="Tick × state (editorial)" value={stateRows} />
      </div>

      <div className="card">
        <h3>By state</h3>
        <table>
          <thead>
            <tr>
              <th>State</th>
              <th style={{ textAlign: 'right' }}>Counties</th>
              <th style={{ textAlign: 'right' }}>Tick rows</th>
              <th style={{ textAlign: 'right' }}>Disease rows</th>
              <th style={{ textAlign: 'right' }}>Σ cases</th>
              <th style={{ textAlign: 'right' }}>Latest yr</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.fips}>
                <td>
                  <Link href={`/data/states/${r.slug}` as Route}>
                    <strong>{r.name}</strong>
                  </Link>{' '}
                  <span className="muted">{r.code}</span>
                </td>
                <td style={{ textAlign: 'right' }}>{r.counties.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>{r.tickRows.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>{r.diseaseRows.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>{r.diseaseCount.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }} className="muted">
                  {r.latestYear ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value.toLocaleString()}</div>
    </div>
  )
}
