import Link from 'next/link'
import type { Route } from 'next'
import { connect, schema } from '@tickpedia/db'
import { TickArt, hasTickArt } from '@tickpedia/ui'
import TickForm from './TickForm'
import { upsertTick } from './actions'

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)
  const ticks = await db
    .select({
      id: schema.ticks.id,
      slug: schema.ticks.slug,
      commonName: schema.ticks.commonName,
      scientificName: schema.ticks.scientificName,
      dangerLevel: schema.ticks.dangerLevel,
      diseases: schema.ticks.diseases,
      heroHeadColor: schema.ticks.heroHeadColor,
      heroBodyColor: schema.ticks.heroBodyColor,
      heroLegColor: schema.ticks.heroLegColor,
      updatedAt: schema.ticks.updatedAt,
    })
    .from(schema.ticks)
    .orderBy(schema.ticks.commonName)

  return (
    <div>
      <h1>Ticks</h1>
      <p className="muted">
        Canonical species. Adding a tick here makes it selectable for &ldquo;single tick&rdquo;
        county presence imports.
      </p>

      <TickForm action={upsertTick} />

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
                <td className="muted">{t.diseases.join(', ') || '—'}</td>
                <td>{t.updatedAt.toISOString().slice(0, 10)}</td>
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
