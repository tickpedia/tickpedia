import Link from 'next/link'
import type { Route } from 'next'
import { sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import FactForm from './FactForm'
import { createFact } from './actions'

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)

  const rows = (await db.execute(sql`
    select
      f.id,
      f.body,
      f.citation_url as "citationUrl",
      f.updated_at   as "updatedAt",
      coalesce((
        select string_agg(t.common_name, ', ' order by t.common_name)
        from wild_fact_ticks ft
        join ticks t on t.id = ft.tick_id
        where ft.wild_fact_id = f.id
      ), '') as "tickList",
      coalesce((
        select string_agg(d.display_name, ', ' order by d.display_name)
        from wild_fact_diseases fd
        join diseases d on d.id = fd.disease_id
        where fd.wild_fact_id = f.id
      ), '') as "diseaseList"
    from wild_facts f
    order by f.updated_at desc
    limit 100
  `)) as unknown as { rows: Row[] } | Row[]

  type Row = {
    id: number
    body: string
    citationUrl: string | null
    updatedAt: Date | string
    tickList: string
    diseaseList: string
  }

  const facts: Row[] = Array.isArray(rows) ? rows : rows.rows

  const [ticks, diseases, techniques] = await Promise.all([
    db
      .select({ id: schema.ticks.id, commonName: schema.ticks.commonName })
      .from(schema.ticks)
      .orderBy(schema.ticks.commonName),
    db
      .select({ id: schema.diseases.id, displayName: schema.diseases.displayName })
      .from(schema.diseases)
      .orderBy(schema.diseases.displayName),
    db
      .select({ id: schema.removalTechniques.id, title: schema.removalTechniques.title })
      .from(schema.removalTechniques)
      .orderBy(schema.removalTechniques.title),
  ])

  return (
    <div>
      <h1>Wild facts</h1>
      <p className="muted">
        Short, citable facts shown next to ticks on the public site. Keep them surprising. A fact
        can attach to multiple ticks, diseases, and removal techniques.
      </p>

      <FactForm
        action={createFact}
        ticks={ticks.map((t) => ({ value: String(t.id), label: t.commonName }))}
        diseases={diseases.map((d) => ({ value: String(d.id), label: d.displayName }))}
        techniques={techniques.map((t) => ({ value: String(t.id), label: t.title }))}
      />

      <div className="card">
        <h3>Recent facts ({facts.length})</h3>
        {facts.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Body</th>
                <th>Ticks</th>
                <th>Diseases</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {facts.map((f) => (
                <tr key={f.id}>
                  <td style={{ maxWidth: 400 }}>
                    {f.body.slice(0, 200)}
                    {f.body.length > 200 ? '…' : ''}
                  </td>
                  <td className="muted">{f.tickList || '—'}</td>
                  <td className="muted">{f.diseaseList || '—'}</td>
                  <td>
                    {(f.updatedAt instanceof Date ? f.updatedAt : new Date(f.updatedAt))
                      .toISOString()
                      .slice(0, 10)}
                  </td>
                  <td>
                    <Link
                      href={`/content/facts/${f.id}` as Route}
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
        )}
      </div>
    </div>
  )
}
