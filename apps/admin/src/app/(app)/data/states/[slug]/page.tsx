// Per-state drilldown. Three panels:
//
//   1. Tick presence by tick × county (latest year per county)
//   2. Disease totals per county across all imported years
//   3. Disease totals year-over-year for the whole state
//
// We do everything in a handful of grouped queries so the page renders
// even for big states (NY, CA) without N+1 round-trips.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'

export default async function StatePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = connect(process.env.DATABASE_URL)

  const [state] = await db
    .select()
    .from(schema.states)
    .where(eq(schema.states.slug, slug))
    .limit(1)
  if (!state) notFound()

  const [counties, tickRows, diseaseTotals, diseaseByYear] = await Promise.all([
    db
      .select({
        fips: schema.counties.fips,
        slug: schema.counties.slug,
        name: schema.counties.countyName,
      })
      .from(schema.counties)
      .where(eq(schema.counties.stateFips, state.fips))
      .orderBy(schema.counties.countyName),

    db.execute(sql`
      select
        c.fips         as "countyFips",
        c.county_name  as "countyName",
        t.common_name  as "tickName",
        tc.year        as year,
        tc.status      as status
      from tick_county tc
      join counties c on c.fips = tc.county_fips
      join ticks t on t.id = tc.tick_id
      where c.state_fips = ${state.fips}
      order by c.county_name, t.common_name, tc.year desc
    `),

    db.execute(sql`
      select
        d.display_name        as "diseaseName",
        c.county_name         as "countyName",
        c.fips                as "countyFips",
        sum(dcy.count)::int   as total
      from disease_county_year dcy
      join diseases d on d.id = dcy.disease_id
      join counties c on c.fips = dcy.county_fips
      where c.state_fips = ${state.fips}
      group by d.display_name, c.county_name, c.fips
      having sum(dcy.count) > 0
      order by total desc
      limit 200
    `),

    db.execute(sql`
      select
        d.display_name      as "diseaseName",
        dcy.year            as year,
        sum(dcy.count)::int as total
      from disease_county_year dcy
      join diseases d on d.id = dcy.disease_id
      join counties c on c.fips = dcy.county_fips
      where c.state_fips = ${state.fips}
      group by d.display_name, dcy.year
      order by dcy.year desc, total desc
    `),
  ])

  const tickList = (Array.isArray(tickRows) ? tickRows : tickRows.rows) as {
    countyFips: string
    countyName: string
    tickName: string
    year: number
    status: 'established' | 'reported' | 'no_records'
  }[]

  const diseaseTotalsList = (Array.isArray(diseaseTotals) ? diseaseTotals : diseaseTotals.rows) as {
    diseaseName: string
    countyName: string
    countyFips: string
    total: number
  }[]

  const diseaseByYearList = (Array.isArray(diseaseByYear)
    ? diseaseByYear
    : diseaseByYear.rows) as { diseaseName: string; year: number; total: number }[]

  // Roll up tick presence: one row per (county, tick) showing latest year + status.
  const tickByCountyTick = new Map<
    string,
    { countyName: string; tickName: string; year: number; status: string }
  >()
  for (const r of tickList) {
    const key = `${r.countyFips}:${r.tickName}`
    const seen = tickByCountyTick.get(key)
    if (!seen || r.year > seen.year) {
      tickByCountyTick.set(key, {
        countyName: r.countyName,
        tickName: r.tickName,
        year: r.year,
        status: r.status,
      })
    }
  }
  const tickSummary = Array.from(tickByCountyTick.values()).sort(
    (a, b) =>
      a.countyName.localeCompare(b.countyName) || a.tickName.localeCompare(b.tickName),
  )

  return (
    <div>
      <p className="muted" style={{ marginBottom: '0.25rem' }}>
        <Link href="/data">← All states</Link>
      </p>
      <h1>
        {state.name} <span className="muted">{state.code}</span>
      </h1>

      <div className="card-grid">
        <Stat label="Counties" value={counties.length} />
        <Stat label="Tick × county rows" value={tickList.length} />
        <Stat label="Disease county-year rows" value={diseaseTotalsList.length} />
        <Stat
          label="Σ cases (all years)"
          value={diseaseTotalsList.reduce((s, r) => s + r.total, 0)}
        />
      </div>

      <div className="card">
        <h3>Tick presence (latest year per county × tick)</h3>
        {tickSummary.length === 0 ? (
          <p className="muted">No tick presence data imported for this state yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>County</th>
                <th>Tick</th>
                <th>Latest year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickSummary.map((r, i) => (
                <tr key={i}>
                  <td>{r.countyName}</td>
                  <td>{r.tickName}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Disease totals by year</h3>
        {diseaseByYearList.length === 0 ? (
          <p className="muted">No disease counts imported for this state yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Disease</th>
                <th style={{ textAlign: 'right' }}>Σ cases (state)</th>
              </tr>
            </thead>
            <tbody>
              {diseaseByYearList.map((r, i) => (
                <tr key={i}>
                  <td>{r.year}</td>
                  <td>{r.diseaseName}</td>
                  <td style={{ textAlign: 'right' }}>{r.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Top counties by disease (lifetime totals, top 200)</h3>
        {diseaseTotalsList.length === 0 ? (
          <p className="muted">No disease counts imported for this state yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>County</th>
                <th>Disease</th>
                <th style={{ textAlign: 'right' }}>Σ cases</th>
              </tr>
            </thead>
            <tbody>
              {diseaseTotalsList.map((r, i) => (
                <tr key={i}>
                  <td>{r.countyName}</td>
                  <td>{r.diseaseName}</td>
                  <td style={{ textAlign: 'right' }}>{r.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
