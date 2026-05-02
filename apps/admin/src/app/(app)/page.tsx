import { connect } from '@tickpedia/db'
import { schema } from '@tickpedia/db'
import { sql, desc } from 'drizzle-orm'

export default async function Dashboard() {
  const db = connect(process.env.DATABASE_URL)

  const [
    [{ ticks } = { ticks: 0 }],
    [{ diseases } = { diseases: 0 }],
    [{ tickCounty } = { tickCounty: 0 }],
    [{ diseaseCountyYear } = { diseaseCountyYear: 0 }],
    [{ wildFacts } = { wildFacts: 0 }],
    [{ removal } = { removal: 0 }],
    recentFacts,
    recentRows,
  ] = await Promise.all([
    db.select({ ticks: sql<number>`count(*)::int` }).from(schema.ticks),
    db.select({ diseases: sql<number>`count(*)::int` }).from(schema.diseases),
    db.select({ tickCounty: sql<number>`count(*)::int` }).from(schema.tickCounty),
    db.select({ diseaseCountyYear: sql<number>`count(*)::int` }).from(schema.diseaseCountyYear),
    db.select({ wildFacts: sql<number>`count(*)::int` }).from(schema.wildFacts),
    db.select({ removal: sql<number>`count(*)::int` }).from(schema.removalTechniques),
    db
      .select({ id: schema.wildFacts.id, body: schema.wildFacts.body, updatedAt: schema.wildFacts.updatedAt })
      .from(schema.wildFacts)
      .orderBy(desc(schema.wildFacts.updatedAt))
      .limit(5),
    db
      .select({
        countyFips: schema.tickCounty.countyFips,
        year: schema.tickCounty.year,
        status: schema.tickCounty.status,
        updatedAt: schema.tickCounty.updatedAt,
      })
      .from(schema.tickCounty)
      .orderBy(desc(schema.tickCounty.updatedAt))
      .limit(5),
  ])

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">A quick read of what&rsquo;s in the database right now.</p>

      <div className="card-grid">
        <Stat label="Ticks" value={ticks} />
        <Stat label="Diseases" value={diseases} />
        <Stat label="Tick × county rows" value={tickCounty} />
        <Stat label="Disease × county × year rows" value={diseaseCountyYear} />
        <Stat label="Wild facts" value={wildFacts} />
        <Stat label="Removal techniques" value={removal} />
      </div>

      <div className="card">
        <h3>Recent wild facts</h3>
        {recentFacts.length === 0 ? (
          <p className="muted">No facts yet — add one from Content → Wild facts.</p>
        ) : (
          <ul>
            {recentFacts.map((f) => (
              <li key={f.id}>
                {f.body.slice(0, 140)}
                {f.body.length > 140 ? '…' : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>Recent tick × county updates</h3>
        {recentRows.length === 0 ? (
          <p className="muted">No tick presence rows yet — import some from Imports → Tick presence.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>FIPS</th>
                <th>Year</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.map((r, i) => (
                <tr key={i}>
                  <td>{r.countyFips}</td>
                  <td>{r.year}</td>
                  <td>
                    <span className={'pill ' + (r.status === 'established' ? 'success' : r.status === 'reported' ? 'warn' : '')}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.updatedAt.toISOString().slice(0, 10)}</td>
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
