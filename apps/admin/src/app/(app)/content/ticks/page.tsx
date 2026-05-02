import Link from 'next/link'
import type { Route } from 'next'
import { sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { TickArt, hasTickArt } from '@tickpedia/ui'
import TickForm from './TickForm'
import { upsertTick } from './actions'

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)

  // One round-trip: ticks + a CSV of disease names per tick + a CSV of
  // removal-technique titles per tick. agg_array would be tighter but
  // string_agg keeps us off Drizzle's PgArray decoder.
  const rows = (await db.execute(sql`
    select
      t.id,
      t.slug,
      t.common_name        as "commonName",
      t.scientific_name    as "scientificName",
      t.danger_level       as "dangerLevel",
      t.hero_head_color    as "heroHeadColor",
      t.hero_body_color    as "heroBodyColor",
      t.hero_leg_color     as "heroLegColor",
      t.updated_at         as "updatedAt",
      coalesce((
        select string_agg(d.display_name, ', ' order by d.display_name)
        from tick_diseases td
        join diseases d on d.id = td.disease_id
        where td.tick_id = t.id
      ), '') as "diseaseList",
      coalesce((
        select count(*) from tick_removal_techniques tr where tr.tick_id = t.id
      ), 0)::int as "techniqueCount"
    from ticks t
    order by t.common_name
  `)) as unknown as
    | { rows: TickRow[] }
    | TickRow[]

  type TickRow = {
    id: number
    slug: string
    commonName: string
    scientificName: string
    dangerLevel: 'low' | 'medium' | 'high'
    heroHeadColor: string | null
    heroBodyColor: string | null
    heroLegColor: string | null
    updatedAt: Date | string
    diseaseList: string
    techniqueCount: number
  }

  const ticks: TickRow[] = Array.isArray(rows) ? rows : rows.rows

  // Pillbox feeds for the create form — full editing surface lives on
  // the per-slug page.
  const [diseases, techniques] = await Promise.all([
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
      <h1>Ticks</h1>
      <p className="muted">
        Canonical species. Adding a tick here makes it selectable for &ldquo;single tick&rdquo;
        county presence imports.
      </p>

      <TickForm
        action={upsertTick}
        diseases={diseases.map((d) => ({ value: String(d.id), label: d.displayName }))}
        techniques={techniques.map((t) => ({ value: String(t.id), label: t.title }))}
      />

      <div className="card">
        <h3>All ticks ({ticks.length})</h3>
        <table>
          <thead>
            <tr>
              <th style={{ width: 56 }}>Art</th>
              <th>Common name</th>
              <th>Scientific</th>
              <th>Danger</th>
              <th>Diseases</th>
              <th>Techniques</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ticks.map((t) => (
              <tr key={t.id}>
                <td>
                  {hasTickArt({
                    headColor: t.heroHeadColor,
                    bodyColor: t.heroBodyColor,
                    legColor: t.heroLegColor,
                  }) ? (
                    <TickArt
                      colors={{
                        headColor: t.heroHeadColor,
                        bodyColor: t.heroBodyColor,
                        legColor: t.heroLegColor,
                      }}
                      size={40}
                    />
                  ) : (
                    <span className="muted" style={{ fontSize: '0.75rem' }}>—</span>
                  )}
                </td>
                <td>{t.commonName}</td>
                <td>
                  <em>{t.scientificName}</em>
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
                    <code>{t.slug}</code>
                  </div>
                </td>
                <td>
                  <span
                    className={
                      'pill ' +
                      (t.dangerLevel === 'high'
                        ? 'error'
                        : t.dangerLevel === 'medium'
                          ? 'warn'
                          : 'success')
                    }
                  >
                    {t.dangerLevel}
                  </span>
                </td>
                <td className="muted">{t.diseaseList || '—'}</td>
                <td className="muted">{t.techniqueCount || '—'}</td>
                <td>
                  {(t.updatedAt instanceof Date ? t.updatedAt : new Date(t.updatedAt))
                    .toISOString()
                    .slice(0, 10)}
                </td>
                <td>
                  <Link
                    href={`/content/ticks/${t.slug}` as Route}
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
