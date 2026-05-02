import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import DiseaseForm from './DiseaseForm'

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function upsertDisease(form: FormData): Promise<{ ok: boolean; error?: string }> {
  'use server'
  const displayName = String(form.get('displayName') ?? '').trim()
  const slugInput = String(form.get('slug') ?? '').trim()
  const aliasesRaw = String(form.get('aliases') ?? '').trim()
  const slug = slugInput || slugify(displayName)
  const aliases = aliasesRaw
    .split(/[,\n]/)
    .map((a) => slugify(a))
    .filter(Boolean)
  if (!aliases.includes(slug)) aliases.unshift(slug)

  if (!displayName) return { ok: false, error: 'Display name required.' }
  if (!slug) return { ok: false, error: 'Slug could not be derived.' }

  const db = connect(process.env.DATABASE_URL)
  await db
    .insert(schema.diseases)
    .values({ slug, displayName, aliases })
    .onConflictDoUpdate({
      target: schema.diseases.slug,
      set: {
        displayName: sql`EXCLUDED.display_name`,
        aliases: sql`EXCLUDED.aliases`,
        updatedAt: sql`now()`,
      },
    })
  await notifySemilayer('diseases')
  revalidatePath('/content/diseases')
  return { ok: true }
}

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)
  const diseases = await db
    .select({
      id: schema.diseases.id,
      slug: schema.diseases.slug,
      displayName: schema.diseases.displayName,
      aliases: schema.diseases.aliases,
      updatedAt: schema.diseases.updatedAt,
    })
    .from(schema.diseases)
    .orderBy(schema.diseases.displayName)

  return (
    <div>
      <h1>Diseases</h1>
      <p className="muted">
        Canonical disease records. Aliases capture the spelling variants we see in CDC files,
        so ingest can resolve loose strings to the right id.
      </p>

      <DiseaseForm action={upsertDisease} />

      <div className="card">
        <h3>All diseases ({diseases.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Display name</th>
              <th>Slug</th>
              <th>Aliases</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {diseases.map((d) => (
              <tr key={d.id}>
                <td>{d.displayName}</td>
                <td>
                  <code>{d.slug}</code>
                </td>
                <td className="muted">{d.aliases.join(', ')}</td>
                <td>{d.updatedAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
