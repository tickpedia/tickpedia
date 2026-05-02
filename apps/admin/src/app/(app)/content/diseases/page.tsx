import Link from 'next/link'
import type { Route } from 'next'
import { sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import DiseaseForm from './DiseaseForm'
import { upsertDisease } from './actions'

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)

  const rows = (await db.execute(sql`
    select
      d.id,
      d.slug,
      d.display_name as "displayName",
      d.aliases,
      d.updated_at  as "updatedAt",
      coalesce((
        select string_agg(t.common_name, ', ' order by t.common_name)
        from tick_diseases td
        join ticks t on t.id = td.tick_id
        where td.disease_id = d.id
      ), '') as "tickList"
    from diseases d
    order by d.display_name
  `)) as unknown as { rows: Row[] } | Row[]

  type Row = {
    id: number
    slug: string
    displayName: string
    aliases: string[]
    updatedAt: Date | string
    tickList: string
  }

  const diseases: Row[] = Array.isArray(rows) ? rows : rows.rows

  const ticks = await db
    .select({ id: schema.ticks.id, commonName: schema.ticks.commonName })
    .from(schema.ticks)
    .orderBy(schema.ticks.commonName)

  return (
    <div>
      <h1>Diseases</h1>
      <p className="muted">
        Canonical disease records. Aliases capture the spelling variants we see in CDC files,
        so ingest can resolve loose strings to the right id. Tick associations come from the
        editor below or from each tick&rsquo;s own page.
      </p>

      <DiseaseForm
        action={upsertDisease}
        ticks={ticks.map((t) => ({ value: String(t.id), label: t.commonName }))}
      />

      <div className="card">
        <h3>All diseases ({diseases.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Display name</th>
              <th>Aliases</th>
              <th>Ticks</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {diseases.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.displayName}
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
                    <code>{d.slug}</code>
                  </div>
                </td>
                <td className="muted" style={{ fontSize: '0.85rem' }}>
                  {d.aliases.join(', ')}
                </td>
                <td className="muted">{d.tickList || '—'}</td>
                <td>
                  {(d.updatedAt instanceof Date ? d.updatedAt : new Date(d.updatedAt))
                    .toISOString()
                    .slice(0, 10)}
                </td>
                <td>
                  <Link
                    href={`/content/diseases/${d.slug}` as Route}
                    className="button secondary"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
