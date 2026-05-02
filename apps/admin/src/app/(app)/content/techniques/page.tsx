import Link from 'next/link'
import type { Route } from 'next'
import { sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import TechniqueForm from './TechniqueForm'
import { upsertTechnique } from './actions'

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)

  const rows = (await db.execute(sql`
    select
      r.id,
      r.slug,
      r.title,
      r.source_url   as "sourceUrl",
      r.updated_at   as "updatedAt",
      coalesce((
        select string_agg(t.common_name, ', ' order by t.common_name)
        from tick_removal_techniques tr
        join ticks t on t.id = tr.tick_id
        where tr.removal_technique_id = r.id
      ), '') as "tickList"
    from removal_techniques r
    order by r.title
  `)) as unknown as { rows: Row[] } | Row[]

  type Row = {
    id: number
    slug: string
    title: string
    sourceUrl: string | null
    updatedAt: Date | string
    tickList: string
  }

  const techniques: Row[] = Array.isArray(rows) ? rows : rows.rows

  const ticks = await db
    .select({ id: schema.ticks.id, commonName: schema.ticks.commonName })
    .from(schema.ticks)
    .orderBy(schema.ticks.commonName)

  return (
    <div>
      <h1>Removal techniques</h1>
      <p className="muted">
        Editorial &ldquo;how to safely remove a tick&rdquo; entries. Upserted by slug — submitting
        with an existing slug overwrites it.
      </p>

      <TechniqueForm
        action={upsertTechnique}
        ticks={ticks.map((t) => ({ value: String(t.id), label: t.commonName }))}
      />

      <div className="card">
        <h3>All techniques ({techniques.length})</h3>
        {techniques.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Ticks</th>
                <th>Source</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {techniques.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>
                    <code>{t.slug}</code>
                  </td>
                  <td className="muted">{t.tickList || '—'}</td>
                  <td>
                    {t.sourceUrl ? (
                      <a href={t.sourceUrl} target="_blank" rel="noreferrer">
                        link
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {(t.updatedAt instanceof Date ? t.updatedAt : new Date(t.updatedAt))
                      .toISOString()
                      .slice(0, 10)}
                  </td>
                  <td>
                    <Link
                      href={`/content/techniques/${t.slug}` as Route}
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
