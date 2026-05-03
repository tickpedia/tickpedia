// Locations dashboard.
//
// Bubbles up the rich surveillance graph at three altitudes:
//
//   1. Nationwide rollups per tick / per pathogen / per disease — at a
//      glance, "how much of each thing do we have?".
//   2. A dense state table that swaps generic row counts for the *signal*
//      an admin actually cares about: which tick dominates, which
//      disease leads, how many pathogens have been detected, and the
//      year span our data covers.
//   3. Drill paths into the state page (and onward to the county page).
//
// Everything is one round-trip per panel; nothing N+1's by state.

import Link from 'next/link'
import type { Route } from 'next'
import { sql } from 'drizzle-orm'
import { connect } from '@tickpedia/db'

interface StateBase {
  fips: string
  code: string
  slug: string
  name: string
  counties: number
  diseaseCount: number
}

interface TickRollup {
  slug: string
  commonName: string
  scientificName: string
  established: number
  reported: number
  firstYear: number | null
  latestYear: number | null
}

interface PathogenRollup {
  slug: string
  displayName: string
  scientificName: string
  presentCounties: number
  firstYear: number | null
  latestYear: number | null
}

interface DiseaseRollup {
  slug: string
  displayName: string
  totalCases: number
  counties: number
  firstYear: number | null
  latestYear: number | null
}

interface StateTopTick {
  stateFips: string
  slug: string
  commonName: string
  established: number
}

interface StateTopDisease {
  stateFips: string
  slug: string
  displayName: string
  cases: number
}

interface StatePathogenCount {
  stateFips: string
  pathogens: number
}

interface StateYearSpan {
  stateFips: string
  firstYear: number | null
  latestYear: number | null
}

export default async function DataIndex() {
  const db = connect(process.env.DATABASE_URL)

  const [
    statesBaseRaw,
    tickRollupRaw,
    pathogenRollupRaw,
    diseaseRollupRaw,
    stateTopTickRaw,
    stateTopDiseaseRaw,
    statePathogenRaw,
    stateYearSpanRaw,
  ] = await Promise.all([
    db.execute(sql`
      select
        s.fips, s.code, s.slug, s.name,
        (select count(*)::int from counties c where c.state_fips = s.fips) as counties,
        coalesce((
          select sum(dcy.count)::bigint
          from disease_county_year dcy
          join counties c on c.fips = dcy.county_fips
          where c.state_fips = s.fips
        ), 0) as "diseaseCount"
      from states s
      order by s.name
    `),

    // Nationwide tick rollup — established / reported counts use the
    // latest year per tick (so "established" means the current state of
    // the world, not a cumulative-ever count). first/latest year capture
    // the surveillance window.
    db.execute(sql`
      with latest as (
        select tick_id, max(year) as max_year
        from tick_county
        group by tick_id
      ),
      span as (
        select tick_id, min(year) as first_year, max(year) as last_year
        from tick_county
        group by tick_id
      )
      select
        t.slug, t.common_name as "commonName", t.scientific_name as "scientificName",
        coalesce(count(distinct tc.county_fips) filter (where tc.status = 'established'), 0)::int as established,
        coalesce(count(distinct tc.county_fips) filter (where tc.status = 'reported'), 0)::int as reported,
        s.first_year as "firstYear",
        s.last_year  as "latestYear"
      from ticks t
      left join latest l on l.tick_id = t.id
      left join tick_county tc on tc.tick_id = t.id and tc.year = l.max_year
      left join span s on s.tick_id = t.id
      group by t.id, t.slug, t.common_name, t.scientific_name, s.first_year, s.last_year
      order by established desc, t.common_name
    `),

    // Pathogen presence is cumulative in CDC's table — once a pathogen is
    // present in a county it stays present in subsequent vintages. So
    // "present counties" is just distinct counties where any vintage
    // marked present.
    db.execute(sql`
      select
        p.slug, p.display_name as "displayName", p.scientific_name as "scientificName",
        coalesce(count(distinct pc.county_fips) filter (where pc.status = 'present'), 0)::int as "presentCounties",
        min(pc.year) filter (where pc.status = 'present')::int as "firstYear",
        max(pc.year) filter (where pc.status = 'present')::int as "latestYear"
      from pathogens p
      left join pathogen_county pc on pc.pathogen_id = p.id
      group by p.id, p.slug, p.display_name, p.scientific_name
      order by "presentCounties" desc, p.display_name
    `),

    // Per-disease nationwide totals from disease_county_year. Note the
    // 2016-2019 / 2019-2022 cumulative windows mean two CDC import passes
    // both write to disease_county_year, so totals overstate vs annual.
    // Lyme is now per-year (importer §D) and is accurate.
    db.execute(sql`
      select
        d.slug, d.display_name as "displayName",
        coalesce(sum(dcy.count), 0)::bigint as "totalCases",
        coalesce(count(distinct dcy.county_fips), 0)::int as counties,
        min(dcy.year)::int as "firstYear",
        max(dcy.year)::int as "latestYear"
      from diseases d
      left join disease_county_year dcy on dcy.disease_id = d.id
      group by d.id, d.slug, d.display_name
      order by "totalCases" desc, d.display_name
    `),

    // Per state: which tick is established in the most counties (latest
    // year). "DISTINCT ON" + ORDER BY is Postgres's idiomatic way to
    // pick one row per group.
    db.execute(sql`
      with latest as (
        select tick_id, max(year) as max_year
        from tick_county
        group by tick_id
      )
      select distinct on (c.state_fips)
        c.state_fips as "stateFips",
        t.slug, t.common_name as "commonName",
        count(distinct tc.county_fips)::int as established
      from tick_county tc
      join latest l on l.tick_id = tc.tick_id and tc.year = l.max_year
      join counties c on c.fips = tc.county_fips
      join ticks t on t.id = tc.tick_id
      where tc.status = 'established'
      group by c.state_fips, t.id, t.slug, t.common_name
      order by c.state_fips, established desc
    `),

    db.execute(sql`
      with totals as (
        select c.state_fips, d.id, d.slug, d.display_name,
               sum(dcy.count)::bigint as cases
        from disease_county_year dcy
        join counties c on c.fips = dcy.county_fips
        join diseases d on d.id = dcy.disease_id
        group by c.state_fips, d.id, d.slug, d.display_name
        having sum(dcy.count) > 0
      )
      select distinct on (state_fips)
        state_fips as "stateFips",
        slug, display_name as "displayName", cases
      from totals
      order by state_fips, cases desc
    `),

    db.execute(sql`
      select c.state_fips as "stateFips",
             count(distinct pc.pathogen_id)::int as pathogens
      from pathogen_county pc
      join counties c on c.fips = pc.county_fips
      where pc.status = 'present'
      group by c.state_fips
    `),

    // Year span across any surveillance table touching the state.
    db.execute(sql`
      select state_fips as "stateFips",
             min(year)::int as "firstYear",
             max(year)::int as "latestYear"
      from (
        select c.state_fips, tc.year
          from tick_county tc join counties c on c.fips = tc.county_fips
        union all
        select c.state_fips, pc.year
          from pathogen_county pc join counties c on c.fips = pc.county_fips
        union all
        select c.state_fips, dcy.year
          from disease_county_year dcy join counties c on c.fips = dcy.county_fips
      ) y
      group by state_fips
    `),
  ])

  const statesBase = unwrap<StateBase>(statesBaseRaw).map((s) => ({
    ...s,
    diseaseCount: Number(s.diseaseCount ?? 0),
  }))
  const tickRollup = unwrap<TickRollup>(tickRollupRaw)
  const pathogenRollup = unwrap<PathogenRollup>(pathogenRollupRaw)
  const diseaseRollup = unwrap<DiseaseRollup>(diseaseRollupRaw).map((d) => ({
    ...d,
    totalCases: Number(d.totalCases ?? 0),
  }))
  const topTickByState = indexBy(unwrap<StateTopTick>(stateTopTickRaw), 'stateFips')
  const topDiseaseByState = indexBy(
    unwrap<StateTopDisease>(stateTopDiseaseRaw).map((d) => ({ ...d, cases: Number(d.cases ?? 0) })),
    'stateFips',
  )
  const pathogenByState = indexBy(unwrap<StatePathogenCount>(statePathogenRaw), 'stateFips')
  const yearSpanByState = indexBy(unwrap<StateYearSpan>(stateYearSpanRaw), 'stateFips')

  // National totals derived from the rollups so the header stats always
  // agree with the tables underneath.
  const totals = {
    counties: statesBase.reduce((s, r) => s + r.counties, 0),
    diseaseCases: diseaseRollup.reduce((s, r) => s + r.totalCases, 0),
    tickEstablished: tickRollup.reduce((s, r) => s + r.established, 0),
    pathogenDetections: pathogenRollup.reduce((s, r) => s + r.presentCounties, 0),
  }
  const allYears = [
    ...tickRollup.flatMap((r) => [r.firstYear, r.latestYear]),
    ...pathogenRollup.flatMap((r) => [r.firstYear, r.latestYear]),
    ...diseaseRollup.flatMap((r) => [r.firstYear, r.latestYear]),
  ].filter((y): y is number => typeof y === 'number')
  const yearSpan =
    allYears.length === 0
      ? null
      : { first: Math.min(...allYears), latest: Math.max(...allYears) }

  return (
    <div>
      <h1>Locations</h1>
      <p className="muted">
        US geography rolled up against every surveillance table. Click a tick or pathogen for its
        nationwide footprint; click a state to drill into counties.
      </p>

      <div className="card-grid">
        <Stat label="States" value={statesBase.length} />
        <Stat label="Counties" value={totals.counties} />
        <Stat label="Tick × county established" value={totals.tickEstablished} />
        <Stat label="Pathogen × county present" value={totals.pathogenDetections} />
        <Stat label="Σ disease cases" value={totals.diseaseCases} />
        <Stat
          label="Surveillance years"
          value={yearSpan ? `${yearSpan.first} – ${yearSpan.latest}` : '—'}
        />
      </div>

      <div className="card">
        <h3>Tick presence (nationwide, latest survey year)</h3>
        {tickRollup.length === 0 ? (
          <p className="muted">No tick presence data imported.</p>
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
              {tickRollup.map((r) => (
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
        <h3>Pathogen prevalence (Ixodes pathogens, cumulative)</h3>
        {pathogenRollup.length === 0 ? (
          <p className="muted">
            No pathogen presence data imported yet. Run{' '}
            <Link href={'/import/pathogen-county' as Route}>
              <strong>Imports → Tick pathogens (county)</strong>
            </Link>{' '}
            with the CDC Ixodes pathogens vintages.
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
              {pathogenRollup.map((r) => (
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
        <h3>Disease cases (nationwide, all years)</h3>
        {diseaseRollup.length === 0 ? (
          <p className="muted">No disease counts imported.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Disease</th>
                <th style={{ textAlign: 'right' }}>Σ cases</th>
                <th style={{ textAlign: 'right' }}>Counties</th>
                <th style={{ textAlign: 'right' }}>Years</th>
              </tr>
            </thead>
            <tbody>
              {diseaseRollup.map((r) => (
                <tr key={r.slug}>
                  <td>
                    <strong>{r.displayName}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>{r.totalCases.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{r.counties.toLocaleString()}</td>
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
        <h3>By state</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Each row shows the dominant tick (established in the most counties for the latest survey
          year), the disease with the largest case total, how many distinct pathogens have been
          detected anywhere in the state, and the years our data covers.
        </p>
        <table>
          <thead>
            <tr>
              <th>State</th>
              <th style={{ textAlign: 'right' }}>Counties</th>
              <th>Top tick (latest)</th>
              <th>Top disease</th>
              <th style={{ textAlign: 'right' }}>Pathogens</th>
              <th style={{ textAlign: 'right' }}>Σ cases</th>
              <th style={{ textAlign: 'right' }}>Years</th>
            </tr>
          </thead>
          <tbody>
            {statesBase.map((r) => {
              const topTick = topTickByState.get(r.fips)
              const topDisease = topDiseaseByState.get(r.fips)
              const pathogens = pathogenByState.get(r.fips)?.pathogens ?? 0
              const span = yearSpanByState.get(r.fips)
              return (
                <tr key={r.fips}>
                  <td>
                    <Link href={`/data/states/${r.slug}` as Route}>
                      <strong>{r.name}</strong>
                    </Link>{' '}
                    <span className="muted">{r.code}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{r.counties.toLocaleString()}</td>
                  <td>
                    {topTick ? (
                      <>
                        {topTick.commonName}{' '}
                        <span className="muted">· {topTick.established} counties</span>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {topDisease ? (
                      <>
                        {topDisease.displayName}{' '}
                        <span className="muted">· {topDisease.cases.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {pathogens > 0 ? pathogens : <span className="muted">—</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{r.diseaseCount.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }} className="muted">
                    {yearRange(span?.firstYear ?? null, span?.latestYear ?? null)}
                  </td>
                </tr>
              )
            })}
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

// Drizzle's `db.execute` returns either an array (Neon serverless) or
// `{ rows }` (node-postgres). Normalize once so call sites stay tidy.
function unwrap<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object' && 'rows' in raw) {
    return (raw as { rows: T[] }).rows
  }
  return []
}

function indexBy<T, K extends keyof T>(rows: T[], key: K): Map<T[K], T> {
  const out = new Map<T[K], T>()
  for (const r of rows) out.set(r[key], r)
  return out
}
