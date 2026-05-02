'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import { readIdList, setRelations } from '../../../../lib/relations'

export interface SaveResult {
  ok: boolean
  error?: string
}

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function upsertTechnique(form: FormData): Promise<SaveResult> {
  const title = String(form.get('title') ?? '').trim()
  const steps = String(form.get('steps') ?? '').trim()
  const sourceUrl = String(form.get('sourceUrl') ?? '').trim() || null
  const slugInput = String(form.get('slug') ?? '').trim()
  const slug = slugInput || slugify(title)

  if (!title) return { ok: false, error: 'Title required.' }
  if (!steps) return { ok: false, error: 'Steps required.' }
  if (!slug) return { ok: false, error: 'Slug could not be derived.' }

  const tickIds = readIdList(form, 'tickIds')

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

  const [row] = await db
    .select({ id: schema.removalTechniques.id })
    .from(schema.removalTechniques)
    .where(eq(schema.removalTechniques.slug, slug))
    .limit(1)

  if (row?.id) {
    await setRelations(
      db,
      {
        table: schema.tickRemovalTechniques,
        parentColumn: schema.tickRemovalTechniques.removalTechniqueId,
        childColumn: schema.tickRemovalTechniques.tickId,
      },
      row.id,
      tickIds,
    )
  }

  await Promise.all([
    notifySemilayer('removalTechniques'),
    notifySemilayer('tickRemovalTechniques'),
  ])
  revalidatePath('/content/techniques')
  revalidatePath(`/content/techniques/${slug}`)
  return { ok: true }
}

export async function deleteTechnique(slug: string): Promise<void> {
  const db = connect(process.env.DATABASE_URL)
  await db.delete(schema.removalTechniques).where(eq(schema.removalTechniques.slug, slug))
  await notifySemilayer('removalTechniques')
  revalidatePath('/content/techniques')
  redirect('/content/techniques')
}
