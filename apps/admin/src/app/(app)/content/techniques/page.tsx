import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import TechniqueForm from './TechniqueForm'

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function upsertTechnique(form: FormData): Promise<{ ok: boolean; error?: string }> {
  'use server'
  const title = String(form.get('title') ?? '').trim()
  const steps = String(form.get('steps') ?? '').trim()
  const sourceUrl = String(form.get('sourceUrl') ?? '').trim() || null
  const slugInput = String(form.get('slug') ?? '').trim()
  const slug = slugInput || slugify(title)

  if (!title) return { ok: false, error: 'Title required.' }
  if (!steps) return { ok: false, error: 'Steps required.' }
  if (!slug) return { ok: false, error: 'Slug could not be derived.' }

  const db = connect(process.env.DATABASE_URL)
  await db
    .insert(schema.removalTechniques)
    .values({ slug, title, steps, sourceUrl })
    .onConflictDoUpdate({
      target: schema.removalTechniques.slug,
      set: {
        title: sql`EXCLUDED.title`,
        steps: sql`EXCLUDED.steps`,
        sourceUrl: sql`EXCLUDED.source_url`,
        updatedAt: sql`now()`,
      },
    })
  await notifySemilayer('removalTechniques')
  revalidatePath('/content/techniques')
  return { ok: true }
}

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)
  const techniques = await db
    .select({
      id: schema.removalTechniques.id,
      slug: schema.removalTechniques.slug,
      title: schema.removalTechniques.title,
      sourceUrl: schema.removalTechniques.sourceUrl,
      updatedAt: schema.removalTechniques.updatedAt,
    })
    .from(schema.removalTechniques)
    .orderBy(schema.removalTechniques.title)

  return (
    <div>
      <h1>Removal techniques</h1>
      <p className="muted">
        Editorial &ldquo;how to safely remove a tick&rdquo; entries. Upserted by slug — submitting
        with an existing slug overwrites it.
      </p>

      <TechniqueForm action={upsertTechnique} />

      <div className="card">
        <h3>All techniques</h3>
        {techniques.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Source</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {techniques.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>
                    <code>{t.slug}</code>
                  </td>
                  <td>
                    {t.sourceUrl ? (
                      <a href={t.sourceUrl} target="_blank" rel="noreferrer">
                        link
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{t.updatedAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
