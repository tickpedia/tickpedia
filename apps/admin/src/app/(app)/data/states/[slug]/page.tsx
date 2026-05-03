// Per-state drilldown.
//
// Four panels stacked top-to-bottom:
//
//   1. Tick presence by tick species (rolled up across this state's
//      counties for the latest survey year — answers "which ticks live
//      here?").
//   2. Pathogen prevalence by pathogen (cumulative — answers "what's
//      circulating in the ticks here?").
//   3. Disease totals by year (state-wide year-over-year, answers "is
//      it getting worse?").
//   4. Counties — one row per county with at-a-glance signal: ticks
//      established, pathogens detected, lifetime cases, top disease.
//      Links to the per-county drilldown.
//
// Everything is parallelized; no per-row lookups.

import Link from 'next/link'
import type { Route } from 'next'
import { notFound } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'

interface TickRow {
  slug: string
  commonName: string
  scientificName: string
  established: number
  reported: number
  firstYear: number | null
  latestYear: number | null
}

interface PathogenRow {
  slug: string
  displayName: string
  scientificName: string
  presentCounties: number
  firstYear: number | null
  latestYear: number | null
}

interface DiseaseYearRow {
  diseaseName: string
  diseaseSlug: string
  year: number
  total: number
}

interface CountyRow {
  fips: string
  slug: string
  countyName: string
  ticksEstablished: number
  pathogensPresent: number
  totalCases: number
  topDisease: string | null
  topDiseaseCases: number | null
  latestYear: number | null
}

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

  const [tickRowsRaw, pathogenRowsRaw, diseaseByYearRaw, countiesRaw] = await Promise.all([
    // Per-tick rollup. Use latest year per tick to determine the current
    // status, then count distinct counties in this state at each status.
    db.execute(sql`
      with latest as (
        select tick_id, max(year) as max_year
        from tick_county tc
        join counties c on c.fips = tc.county_fips
        where c.state_fips = ${state.fips}
        group by tick_id
      ),
      span as (
        select tc.tick_id, min(tc.year) as first_year, max(tc.year) as last_year
        from tick_county tc
        join counties c on c.fips = tc.county_fips
        where c.state_fips = ${state.fips}
        group by tc.tick_id
      )
      select
        t.slug, t.common_name as "commonName", t.scientific_name as "scientificName",
        coalesce(count(distinct tc.county_fips) filter (where tc.status = 'established'), 0)::int as established,
        coalesce(count(distinct tc.county_fips) filter (where tc.status = 'reported'), 0)::int as reported,
        s.first_year as "firstYear",
        s.last_year  as "latestYear"
      from latest l
      join ticks t on t.id = l.tick_id
      left join span s on s.tick_id = t.id
      left join tick_county tc
        on tc.tick_id = t.id and tc.year = l.max_year
        and tc.county_fips in (select fips from counties where state_fips = ${state.fips})
      group by t.id, t.slug, t.common_name, t.scientific_name, s.first_year, s.last_year
      order by established desc, reported desc, t.common_name
    `),

    db.execute(sql`
      select
        p.slug, p.display_name as "displayName", p.scientific_name as "scientificName",
        count(distinct pc.county_fips)::int as "presentCounties",
        min(pc.year)::int as "firstYear",
        max(pc.year)::int as "latestYear"
      from pathogen_county pc
      join pathogens p on p.id = pc.pathogen_id
      join counties c on c.fips = pc.county_fips
      where c.state_fips = ${state.fips} and pc.status = 'present'
      group by p.id, p.slug, p.display_name, p.scientific_name
      order by "presentCounties" desc, p.display_name
    `),

    db.execute(sql`
      select
        d.slug                as "diseaseSlug",
        d.display_name        as "diseaseName",
        dcy.year              as year,
        sum(dcy.count)::int   as total
      from disease_county_year dcy
      join diseases d on d.id = dcy.disease_id
      join counties c on c.fips = dcy.county_fips
      where c.state_fips = ${state.fips}
      group by d.id, d.slug, d.display_name, dcy.year
      order by dcy.year desc, total desc
    `),

    // Per-county rollup: ticks established (latest year per tick × county),
    // pathogens detected (cumulative, status='present'), Σ cases, top disease.
    db.execute(sql`
      with tick_latest as (
        select distinct on (tc.tick_id, tc.county_fips)
          tc.tick_id, tc.county_fips, tc.status, tc.year
        from tick_county tc
        join counties c on c.fips = tc.county_fips
        where c.state_fips = ${state.fips}
        order by tc.tick_id, tc.county_fips, tc.year desc
      ),
      tick_est as (
        select county_fips, count(*)::int as ticks_established
        from tick_latest
        where status = 'established'
        group by county_fips
      ),
      path_pres as (
        select pc.county_fips, count(distinct pc.pathogen_id)::int as pathogens_present
        from pathogen_county pc
        join counties c on c.fips = pc.county_fips
        where c.state_fips = ${state.fips} and pc.status = 'present'
        group by pc.county_fips
      ),
      dis_total as (
        select dcy.county_fips,
               coalesce(sum(dcy.count), 0)::int as total_cases,
               max(dcy.year) as latest_year
        from disease_county_year dcy
        join counties c on c.fips = dcy.county_fips
        where c.state_fips = ${state.fips}
        group by dcy.county_fips
      ),
      top_dis as (
        select distinct on (dcy.county_fips)
          dcy.county_fips,
          d.display_name as top_disease,
          sum(dcy.count)::int as top_cases
        from disease_county_year dcy
        join diseases d on d.id = dcy.disease_id
        join counties c on c.fips = dcy.county_fips
        where c.state_fips = ${state.fips}
        group by dcy.county_fips, d.id, d.display_name
        order by dcy.county_fips, sum(dcy.count) desc
      )
      select
        c.fips, c.slug, c.county_name as "countyName",
        coalesce(te.ticks_established, 0)   as "ticksEstablished",
        coalesce(pp.pathogens_present, 0)   as "pathogensPresent",
        coalesce(dt.total_cases, 0)         as "totalCases",
        td.top_disease                       as "topDisease",
        td.top_cases                         as "topDiseaseCases",
        dt.latest_year                       as "latestYear"
      from counties c
      left join tick_est  te on te.county_fips = c.fips
      left join path_pres pp on pp.county_fips = c.fips
      left join dis_total dt on dt.county_fips = c.fips
      left join top_dis   td on td.county_fips = c.fips
      where c.state_fips = ${state.fips}
      order by "totalCases" desc, c.county_name
    `),
  ])

  const tickRows = unwrap<TickRow>(tickRowsRaw)
  const pathogenRows = unwrap<PathogenRow>(pathogenRowsRaw)
  const diseaseByYear = unwrap<DiseaseYearRow>(diseaseByYearRaw)
  const counties = unwrap<CountyRow>(countiesRaw).map((c) => ({
    ...c,
    ticksEstablished: Number(c.ticksEstablished ?? 0),
    pathogensPresent: Number(c.pathogensPresent ?? 0),
    totalCases: Number(c.totalCases ?? 0),
    topDiseaseCases: c.topDiseaseCases == null ? null : Number(c.topDiseaseCases),
  }))

  const totals = {
    counties: counties.length,
    ticksEstablished: tickRows.reduce((s, r) => s + r.established, 0),
    pathogensPresent: pathogenRows.length,
    totalCases: counties.reduce((s, c) => s + c.totalCases, 0),
  }

  // Year span across whatever surveillance touched this state.
  const allYears = [
    ...tickRows.flatMap((r) => [r.firstYear, r.latestYear]),
    ...pathogenRows.flatMap((r) => [r.firstYear, r.latestYear]),
    ...diseaseByYear.map((r) => r.year),
  ].filter((y): y is number => typeof y === 'number')
  const yearSpan =
    allYears.length === 0
      ? null
      : { first: Math.min(...allYears), latest: Math.max(...allYears) }

  // Pivot disease totals into a (year × disease) matrix for a denser
  // year-over-year read. Sort years desc, diseases by total cases.
  const yearKeys = Array.from(new Set(diseaseByYear.map((r) => r.year))).sort((a, b) => b - a)
  const diseaseTotalsMap = new Map<string, { name: string; total: number }>()
  for (const r of diseaseByYear) {
    const seen = diseaseTotalsMap.get(r.diseaseSlug)
    if (seen) seen.total += r.total
    else diseaseTotalsMap.set(r.diseaseSlug, { name: r.diseaseName, total: r.total })
  }
  const diseaseOrder = Array.from(diseaseTotalsMap.entries()).sort(
    (a, b) => b[1].total - a[1].total,
  )
  const cellByYearDisease = new Map<string, number>()
  for (const r of diseaseByYear) cellByYearDisease.set(`${r.year}|${r.diseaseSlug}`, r.total)

  return (
    <div>
      <p className="muted" style={{ marginBottom: '0.25rem' }}>
        <Link href={'/data' as Route}>← All states</Link>
      </p>
      <h1>
        {state.name} <span className="muted">{state.code}</span>
      </h1>

      <div className="card-grid">
        <Stat label="Counties" value={totals.counties} />
        <Stat label="Ticks established" value={totals.ticksEstablished} />
        <Stat label="Pathogens detected" value={totals.pathogensPresent} />
        <Stat label="Σ cases (all years)" value={totals.totalCases} />
        <Stat
          label="Years"
          value={yearSpan ? `${yearSpan.first} – ${yearSpan.latest}` : '—'}
        />
      </div>

      <div className="card">
        <h3>Tick presence (latest survey year)</h3>
        {tickRows.length === 0 ? (
          <p className="muted">No tick presence data imported for this state yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tick</th>
                <th style={{ textAlign: 'right' }}>Established</th>
                <th style={{ textAlign: 'right' }}>Reported</th>
                <th style={{ textAlign: 'right' }}>Years</th>
              </tr>
            </thead>
            <tbody>
              {tickRows.map((r) => (
                <tr key={r.slug}>
                  <td>
                    <strong>{r.commonName}</strong>{' '}
                    <span className="muted" style={{ fontStyle: 'italic' }}>
                      {r.scientificName}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{r.established.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{r.reported.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }} className="muted">
                    {yearRange(r.firstYear, r.latestYear)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Pathogen prevalence (cumulative)</h3>
        {pathogenRows.length === 0 ? (
          <p className="muted">
            No pathogens detected in this state yet — either nothing imported, or every county is{' '}
            <code>no_records</code>.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pathogen</th>
                <th style={{ textAlign: 'right' }}>Counties present</th>
                <th style={{ textAlign: 'right' }}>Years</th>
              </tr>
            </thead>
            <tbody>
              {pathogenRows.map((r) => (
                <tr key={r.slug}>
                  <td>
                    <strong>{r.displayName}</strong>{' '}
                    <span className="muted" style={{ fontStyle: 'italic' }}>
                      {r.scientificName}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{r.presentCounties.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }} className="muted">
                    {yearRange(r.firstYear, r.latestYear)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Disease cases by year × disease</h3>
        {diseaseByYear.length === 0 ? (
          <p className="muted">No disease counts imported for this state yet.</p>
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
                        const v = cellByYearDisease.get(`${y}|${slug}`) ?? 0
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

      <div className="card">
        <h3>Counties</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Sorted by lifetime case load. Click a county for full tick / pathogen / disease history.
        </p>
        <table>
          <thead>
            <tr>
              <th>County</th>
              <th style={{ textAlign: 'right' }}>Ticks established</th>
              <th style={{ textAlign: 'right' }}>Pathogens</th>
              <th style={{ textAlign: 'right' }}>Σ cases</th>
              <th>Top disease</th>
            </tr>
          </thead>
          <tbody>
            {counties.map((c) => (
              <tr key={c.fips}>
                <td>
                  <Link href={`/data/counties/${c.fips}` as Route}>
                    <strong>{c.countyName}</strong>
                  </Link>{' '}
                  <span className="muted">{c.fips}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {c.ticksEstablished > 0 ? (
                    c.ticksEstablished
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {c.pathogensPresent > 0 ? (
                    c.pathogensPresent
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {c.totalCases > 0 ? (
                    c.totalCases.toLocaleString()
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  {c.topDisease ? (
                    <>
                      {c.topDisease}{' '}
                      <span className="muted">
                        · {(c.topDiseaseCases ?? 0).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

function yearRange(first: number | null, latest: number | null): string {
  if (first == null || latest == null) return '—'
  if (first === latest) return String(first)
  return `${first} – ${latest}`
}

function unwrap<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object' && 'rows' in raw) {
    return (raw as { rows: T[] }).rows
  }
  return []
}
