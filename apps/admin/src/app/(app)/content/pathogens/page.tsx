import Link from 'next/link'
import type { Route } from 'next'
import { sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import PathogenForm from './PathogenForm'
import { upsertPathogen } from './actions'

interface Row {
  id: number
  slug: string
  displayName: string
  scientificName: string
  aliases: string[]
  updatedAt: Date | string
  tickList: string
  diseaseList: string
}

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)

  const rowsRaw = (await db.execute(sql`
    select
      p.id,
      p.slug,
      p.display_name      as "displayName",
      p.scientific_name   as "scientificName",
      p.aliases,
      p.updated_at        as "updatedAt",
      coalesce((
        select string_agg(t.common_name, ', ' order by t.common_name)
        from tick_pathogens tp
        join ticks t on t.id = tp.tick_id
        where tp.pathogen_id = p.id
      ), '') as "tickList",
      coalesce((
        select string_agg(d.display_name, ', ' order by d.display_name)
        from disease_pathogens dp
        join diseases d on d.id = dp.disease_id
        where dp.pathogen_id = p.id
      ), '') as "diseaseList"
    from pathogens p
    order by p.display_name
  `)) as unknown as { rows: Row[] } | Row[]

  const pathogens: Row[] = Array.isArray(rowsRaw) ? rowsRaw : rowsRaw.rows

  const [ticks, diseases] = await Promise.all([
    db
      .select({ id: schema.ticks.id, commonName: schema.ticks.commonName })
      .from(schema.ticks)
      .orderBy(schema.ticks.commonName),
    db
      .select({ id: schema.diseases.id, displayName: schema.diseases.displayName })
      .from(schema.diseases)
      .orderBy(schema.diseases.displayName),
  ])

  return (
    <div>
      <h1>Pathogens</h1>
      <p className="muted">
        Canonical pathogens (Ixodes-borne and beyond). The <code>tick × pathogen</code> and{' '}
        <code>disease × pathogen</code> joins drive the read-side rails on the public site —
        editing them here keeps the graph wired.
      </p>

      <PathogenForm
        action={upsertPathogen}
        ticks={ticks.map((t) => ({ value: String(t.id), label: t.commonName }))}
        diseases={diseases.map((d) => ({ value: String(d.id), label: d.displayName }))}
      />

      <div className="card">
        <h3>All pathogens ({pathogens.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Display name</th>
              <th>Aliases</th>
              <th>Ticks</th>
              <th>Diseases</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pathogens.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.displayName}
                  <div className="muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                    {p.scientificName}
                  </div>
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
                    <code>{p.slug}</code>
                  </div>
                </td>
                <td className="muted" style={{ fontSize: '0.85rem' }}>
                  {p.aliases.join(', ')}
                </td>
                <td className="muted">{p.tickList || '—'}</td>
                <td className="muted">{p.diseaseList || '—'}</td>
                <td>
                  {(p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt))
                    .toISOString()
                    .slice(0, 10)}
                </td>
                <td>
                  <Link
                    href={`/content/pathogens/${p.slug}` as Route}
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
