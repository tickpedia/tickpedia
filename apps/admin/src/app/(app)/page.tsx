// Admin dashboard.
//
// Five panels stacked top-to-bottom:
//
//   1. Hero stat grid — entity totals (ticks, diseases, pathogens,
//      removal techniques, wild facts, counties).
//   2. Surveillance health — one row per surveillance table with row
//      count, year span, and the most recent updated_at. CTAs to the
//      relevant import page when a table is empty.
//   3. Editorial coverage — per-entity gaps: which ticks lack hero art,
//      which diseases lack a one-liner, etc. Surfaces work to do.
//   4. Knowledge graph — edge counts across the join tables, so you
//      can tell at a glance whether the disease ↔ pathogen ↔ tick mesh
//      is fully wired.
//   5. Recent activity — most recent surveillance vintages applied +
//      the latest five wild facts.
//
// Every datum is one round-trip; nothing N+1's. Designed for a quick
// at-a-glance read on landing, with drill paths into Locations / Imports
// / Content for follow-up.

import Link from 'next/link'
import type { Route } from 'next'
import { sql } from 'drizzle-orm'
import { connect } from '@tickpedia/db'

interface Counts {
  ticks: number
  diseases: number
  pathogens: number
  techniques: number
  wildFacts: number
  states: number
  counties: number
}

interface SurveillanceRow {
  kind: 'tick_county' | 'pathogen_county' | 'disease_county_year' | 'disease_month'
  rows: number
  firstYear: number | null
  latestYear: number | null
  lastUpdated: Date | null
}

interface EditorialCoverage {
  ticks: number
  ticksWithOneLiner: number
  ticksWithHero: number
  ticksWithPhoto: number
  diseases: number
  diseasesWithOneLiner: number
  diseasesWithAliases: number
  pathogens: number
  pathogensWithOneLiner: number
  techniques: number
  techniquesWithOneLiner: number
}

interface GraphEdges {
  tickDiseases: number
  tickPathogens: number
  diseasePathogens: number
  tickRemovalTechniques: number
  wildFactTicks: number
  wildFactDiseases: number
  wildFactTechniques: number
}

interface RecentVintage {
  kind: string
  label: string
  year: number
  rows: number
  lastUpdated: Date
}

interface RecentFact {
  id: number
  body: string
  updatedAt: Date
}

export default async function Dashboard() {
  const db = connect(process.env.DATABASE_URL)

  const [countsRaw, surveillanceRaw, coverageRaw, graphRaw, recentVintagesRaw, recentFactsRaw] =
    await Promise.all([
      db.execute(sql`
        select
          (select count(*)::int from ticks)              as ticks,
          (select count(*)::int from diseases)           as diseases,
          (select count(*)::int from pathogens)          as pathogens,
          (select count(*)::int from removal_techniques) as techniques,
          (select count(*)::int from wild_facts)         as "wildFacts",
          (select count(*)::int from states)             as states,
          (select count(*)::int from counties)           as counties
      `),

      db.execute(sql`
        select 'tick_county' as kind,
               count(*)::int as rows,
               min(year)::int as "firstYear",
               max(year)::int as "latestYear",
               max(updated_at) as "lastUpdated"
        from tick_county
        union all
        select 'pathogen_county', count(*)::int, min(year)::int, max(year)::int, max(updated_at)
        from pathogen_county
        union all
        select 'disease_county_year', count(*)::int, min(year)::int, max(year)::int, max(updated_at)
        from disease_county_year
        union all
        select 'disease_month', count(*)::int, min(year)::int, max(year)::int, max(updated_at)
        from disease_month
      `),

      db.execute(sql`
        select
          (select count(*)::int from ticks) as ticks,
          (select count(*)::int from ticks where one_liner is not null and length(trim(one_liner)) > 0) as "ticksWithOneLiner",
          (select count(*)::int from ticks where hero_head_color is not null) as "ticksWithHero",
          (select count(*)::int from ticks where hero_photo_url is not null) as "ticksWithPhoto",
          (select count(*)::int from diseases) as diseases,
          (select count(*)::int from diseases where one_liner is not null and length(trim(one_liner)) > 0) as "diseasesWithOneLiner",
          (select count(*)::int from diseases where array_length(aliases, 1) > 0) as "diseasesWithAliases",
          (select count(*)::int from pathogens) as pathogens,
          (select count(*)::int from pathogens where one_liner is not null and length(trim(one_liner)) > 0) as "pathogensWithOneLiner",
          (select count(*)::int from removal_techniques) as techniques,
          (select count(*)::int from removal_techniques where one_liner is not null and length(trim(one_liner)) > 0) as "techniquesWithOneLiner"
      `),

      db.execute(sql`
        select
          (select count(*)::int from tick_diseases)             as "tickDiseases",
          (select count(*)::int from tick_pathogens)            as "tickPathogens",
          (select count(*)::int from disease_pathogens)         as "diseasePathogens",
          (select count(*)::int from tick_removal_techniques)   as "tickRemovalTechniques",
          (select count(*)::int from wild_fact_ticks)           as "wildFactTicks",
          (select count(*)::int from wild_fact_diseases)        as "wildFactDiseases",
          (select count(*)::int from wild_fact_removal_techniques) as "wildFactTechniques"
      `),

      // Recent surveillance "vintages" — one row per (table, year) so a
      // freshly-imported 2025 batch shows up as a single line, not 3,000.
      db.execute(sql`
        with v as (
          select 'tick_county' as kind, year, count(*)::int as rows, max(updated_at) as "lastUpdated" from tick_county group by year
          union all
          select 'pathogen_county', year, count(*)::int, max(updated_at) from pathogen_county group by year
          union all
          select 'disease_county_year', year, count(*)::int, max(updated_at) from disease_county_year group by year
          union all
          select 'disease_month', year, count(*)::int, max(updated_at) from disease_month group by year
        )
        select kind, year, rows, "lastUpdated" from v order by "lastUpdated" desc nulls last limit 8
      `),

      db.execute(sql`
        select id, body, updated_at as "updatedAt"
        from wild_facts
        order by updated_at desc
        limit 5
      `),
    ])

  const counts = unwrap<Counts>(countsRaw)[0] ?? {
    ticks: 0,
    diseases: 0,
    pathogens: 0,
    techniques: 0,
    wildFacts: 0,
    states: 0,
    counties: 0,
  }
  const surveillance = unwrap<SurveillanceRow>(surveillanceRaw).map((r) => ({
    ...r,
    rows: Number(r.rows ?? 0),
    lastUpdated: r.lastUpdated ? new Date(r.lastUpdated) : null,
  }))
  const coverage = unwrap<EditorialCoverage>(coverageRaw)[0] ?? {
    ticks: 0,
    ticksWithOneLiner: 0,
    ticksWithHero: 0,
    ticksWithPhoto: 0,
    diseases: 0,
    diseasesWithOneLiner: 0,
    diseasesWithAliases: 0,
    pathogens: 0,
    pathogensWithOneLiner: 0,
    techniques: 0,
    techniquesWithOneLiner: 0,
  }
  const graph = unwrap<GraphEdges>(graphRaw)[0] ?? {
    tickDiseases: 0,
    tickPathogens: 0,
    diseasePathogens: 0,
    tickRemovalTechniques: 0,
    wildFactTicks: 0,
    wildFactDiseases: 0,
    wildFactTechniques: 0,
  }
  const recentVintages = unwrap<RecentVintage>(recentVintagesRaw).map((r) => ({
    ...r,
    rows: Number(r.rows ?? 0),
    lastUpdated: new Date(r.lastUpdated),
    label: surveillanceLabel(r.kind),
  }))
  const recentFacts = unwrap<RecentFact>(recentFactsRaw).map((f) => ({
    ...f,
    updatedAt: new Date(f.updatedAt),
  }))

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">
        Tickpedia health at a glance. Drill into{' '}
        <Link href={'/data' as Route}>Locations</Link> for the geo rollup or{' '}
        <Link href={'/content/ticks' as Route}>Content</Link> to edit.
      </p>

      <div className="card-grid">
        <Stat label="Ticks" value={counts.ticks} />
        <Stat label="Diseases" value={counts.diseases} />
        <Stat label="Pathogens" value={counts.pathogens} />
        <Stat label="Removal techniques" value={counts.techniques} />
        <Stat label="Wild facts" value={counts.wildFacts} />
        <Stat label="Counties" value={counts.counties} />
      </div>

      <div className="card">
        <h3>Surveillance health</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Where the scientific data sits right now. Empty tables link to their importer.
        </p>
        <table>
          <thead>
            <tr>
              <th>Table</th>
              <th style={{ textAlign: 'right' }}>Rows</th>
              <th style={{ textAlign: 'right' }}>Years</th>
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {surveillance.map((r) => (
              <tr key={r.kind}>
                <td>
                  <strong>{surveillanceLabel(r.kind)}</strong>{' '}
                  <span className="muted">{tableHint(r.kind)}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {r.rows > 0 ? (
                    r.rows.toLocaleString()
                  ) : (
                    <Link href={importHref(r.kind)}>import →</Link>
                  )}
                </td>
                <td style={{ textAlign: 'right' }} className="muted">
                  {yearRange(r.firstYear, r.latestYear)}
                </td>
                <td className="muted">{r.lastUpdated ? relative(r.lastUpdated) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Editorial coverage</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Gaps in the human-facing fields the public site renders. A bar tilted right means
          coverage is good; left means there&rsquo;s editorial work waiting.
        </p>
        <table>
          <thead>
            <tr>
              <th>Entity</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>One-liner</th>
              <th>Other</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Link href={'/content/ticks' as Route}>
                  <strong>Ticks</strong>
                </Link>
              </td>
              <td style={{ textAlign: 'right' }}>{coverage.ticks}</td>
              <td>
                <CoverageBar have={coverage.ticksWithOneLiner} total={coverage.ticks} />
              </td>
              <td>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  Hero art {coverage.ticksWithHero}/{coverage.ticks} · Photo{' '}
                  {coverage.ticksWithPhoto}/{coverage.ticks}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <Link href={'/content/diseases' as Route}>
                  <strong>Diseases</strong>
                </Link>
              </td>
              <td style={{ textAlign: 'right' }}>{coverage.diseases}</td>
              <td>
                <CoverageBar have={coverage.diseasesWithOneLiner} total={coverage.diseases} />
              </td>
              <td>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  With aliases {coverage.diseasesWithAliases}/{coverage.diseases}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Pathogens</strong>
              </td>
              <td style={{ textAlign: 'right' }}>{coverage.pathogens}</td>
              <td>
                <CoverageBar
                  have={coverage.pathogensWithOneLiner}
                  total={coverage.pathogens}
                />
              </td>
              <td>
                <span className="muted">—</span>
              </td>
            </tr>
            <tr>
              <td>
                <Link href={'/content/techniques' as Route}>
                  <strong>Removal techniques</strong>
                </Link>
              </td>
              <td style={{ textAlign: 'right' }}>{coverage.techniques}</td>
              <td>
                <CoverageBar
                  have={coverage.techniquesWithOneLiner}
                  total={coverage.techniques}
                />
              </td>
              <td>
                <span className="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Knowledge graph</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Edges across the editorial joins. Powers chained queries like{' '}
          <em>disease → pathogens → counties tested positive</em>.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <Edge label="Tick ↔ Disease" value={graph.tickDiseases} />
          <Edge label="Tick ↔ Pathogen" value={graph.tickPathogens} />
          <Edge label="Disease ↔ Pathogen" value={graph.diseasePathogens} />
          <Edge label="Tick ↔ Technique" value={graph.tickRemovalTechniques} />
          <Edge label="Wild fact ↔ Tick" value={graph.wildFactTicks} />
          <Edge label="Wild fact ↔ Disease" value={graph.wildFactDiseases} />
          <Edge label="Wild fact ↔ Technique" value={graph.wildFactTechniques} />
        </div>
      </div>

      <div className="card">
        <h3>Recent surveillance vintages</h3>
        {recentVintages.length === 0 ? (
          <p className="muted">No surveillance imports yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Table</th>
                <th>Vintage</th>
                <th style={{ textAlign: 'right' }}>Rows</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentVintages.map((r, i) => (
                <tr key={i}>
                  <td>
                    <strong>{r.label}</strong>
                  </td>
                  <td>{r.year}</td>
                  <td style={{ textAlign: 'right' }}>{r.rows.toLocaleString()}</td>
                  <td className="muted">{relative(r.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Recent wild facts</h3>
        {recentFacts.length === 0 ? (
          <p className="muted">
            No facts yet — add one from{' '}
            <Link href={'/content/facts' as Route}>Content → Wild facts</Link>.
          </p>
        ) : (
          <ul style={{ paddingLeft: '1.1rem', margin: 0 }}>
            {recentFacts.map((f) => (
              <li key={f.id} style={{ marginBottom: '0.4rem' }}>
                {f.body.slice(0, 160)}
                {f.body.length > 160 ? '…' : ''}{' '}
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  · {relative(f.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
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

function Edge({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '0.6rem 0.75rem',
      }}
    >
      <div
        className="muted"
        style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{value.toLocaleString()}</div>
    </div>
  )
}

// Inline coverage bar — green proportion = filled, neutral remainder.
// One line, no JS interactivity needed.
function CoverageBar({ have, total }: { have: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((have / total) * 100)
  const color =
    pct >= 90 ? 'var(--success)' : pct >= 50 ? 'var(--warn)' : 'var(--error)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        style={{
          flex: '1 1 auto',
          height: 8,
          background: 'var(--border)',
          borderRadius: 999,
          overflow: 'hidden',
          minWidth: 80,
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span className="muted" style={{ fontSize: '0.8rem', minWidth: 60, textAlign: 'right' }}>
        {have}/{total} · {pct}%
      </span>
    </div>
  )
}

function surveillanceLabel(kind: string): string {
  switch (kind) {
    case 'tick_county':
      return 'Tick × county'
    case 'pathogen_county':
      return 'Pathogen × county'
    case 'disease_county_year':
      return 'Disease × county × year'
    case 'disease_month':
      return 'Disease × month (national)'
    default:
      return kind
  }
}

function tableHint(kind: string): string {
  switch (kind) {
    case 'tick_county':
      return 'CDC ArboNET presence by tick'
    case 'pathogen_county':
      return 'CDC Ixodes pathogens (cumulative)'
    case 'disease_county_year':
      return 'CDC tick-borne case counts'
    case 'disease_month':
      return 'CDC nationwide monthly counts'
    default:
      return ''
  }
}

function importHref(kind: string): Route {
  switch (kind) {
    case 'tick_county':
      return '/import/tick-county' as Route
    case 'pathogen_county':
      return '/import/pathogen-county' as Route
    case 'disease_county_year':
      return '/import/cdc-county' as Route
    case 'disease_month':
      return '/import/cdc-month' as Route
    default:
      return '/' as Route
  }
}

function yearRange(first: number | null, latest: number | null): string {
  if (first == null || latest == null) return '—'
  if (first === latest) return String(first)
  return `${first} – ${latest}`
}

function relative(d: Date): string {
  const ms = Date.now() - d.getTime()
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  const yr = Math.round(mo / 12)
  return `${yr}y ago`
}

function unwrap<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object' && 'rows' in raw) {
    return (raw as { rows: T[] }).rows
  }
  return []
}
