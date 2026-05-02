import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import TickForm from './TickForm'

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function upsertTick(form: FormData): Promise<{ ok: boolean; error?: string }> {
  'use server'
  const commonName = String(form.get('commonName') ?? '').trim()
  const scientificName = String(form.get('scientificName') ?? '').trim()
  const slugInput = String(form.get('slug') ?? '').trim()
  const dangerLevel = String(form.get('dangerLevel') ?? 'low') as 'low' | 'medium' | 'high'
  const heroPhotoUrl = String(form.get('heroPhotoUrl') ?? '').trim() || null
  const diseasesRaw = String(form.get('diseases') ?? '').trim()
  const diseases = diseasesRaw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const slug = slugInput || slugify(scientificName || commonName)

  if (!commonName) return { ok: false, error: 'Common name required.' }
  if (!scientificName) return { ok: false, error: 'Scientific name required.' }
  if (!slug) return { ok: false, error: 'Slug could not be derived.' }

  const db = connect(process.env.DATABASE_URL)
  await db
    .insert(schema.ticks)
    .values({
      slug,
      commonName,
      scientificName,
      dangerLevel,
      heroPhotoUrl,
      diseases,
    })
    .onConflictDoUpdate({
      target: schema.ticks.slug,
      set: {
        commonName: sql`EXCLUDED.common_name`,
        scientificName: sql`EXCLUDED.scientific_name`,
        dangerLevel: sql`EXCLUDED.danger_level`,
        heroPhotoUrl: sql`EXCLUDED.hero_photo_url`,
        diseases: sql`EXCLUDED.diseases`,
        updatedAt: sql`now()`,
      },
    })
  revalidatePath('/content/ticks')
  return { ok: true }
}

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
              <th>Common name</th>
              <th>Scientific</th>
              <th>Slug</th>
              <th>Danger</th>
              <th>Diseases</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {ticks.map((t) => (
              <tr key={t.id}>
                <td>{t.commonName}</td>
                <td>
                  <em>{t.scientificName}</em>
                </td>
                <td>
                  <code>{t.slug}</code>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
