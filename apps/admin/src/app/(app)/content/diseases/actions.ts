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

export async function upsertDisease(form: FormData): Promise<SaveResult> {
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

  const tickIds = readIdList(form, 'tickIds')

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

  const [row] = await db
    .select({ id: schema.diseases.id })
    .from(schema.diseases)
    .where(eq(schema.diseases.slug, slug))
    .limit(1)

  if (row?.id) {
    await setRelations(
      db,
      {
        table: schema.tickDiseases,
        parentColumn: schema.tickDiseases.diseaseId,
        childColumn: schema.tickDiseases.tickId,
      },
      row.id,
      tickIds,
    )
  }

  await Promise.all([notifySemilayer('diseases'), notifySemilayer('tickDiseases')])
  revalidatePath('/content/diseases')
  revalidatePath(`/content/diseases/${slug}`)
  return { ok: true }
}

export async function deleteDisease(slug: string): Promise<void> {
  const db = connect(process.env.DATABASE_URL)
  await db.delete(schema.diseases).where(eq(schema.diseases.slug, slug))
  await notifySemilayer('diseases')
  revalidatePath('/content/diseases')
  redirect('/content/diseases')
}
