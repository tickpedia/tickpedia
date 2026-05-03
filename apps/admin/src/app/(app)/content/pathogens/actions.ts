'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { notifySemilayer } from '../../../../lib/semilayer-notify'
import { readIdList, setRelations } from '../../../../lib/relations'
import { normalizeOneLiner } from '../../../../lib/json-import'

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

export async function upsertPathogen(form: FormData): Promise<SaveResult> {
  const displayName = String(form.get('displayName') ?? '').trim()
  const scientificName = String(form.get('scientificName') ?? '').trim()
  const slugInput = String(form.get('slug') ?? '').trim()
  const aliasesRaw = String(form.get('aliases') ?? '').trim()
  const slug = slugInput || slugify(scientificName || displayName)
  const aliases = aliasesRaw
    .split(/[,\n]/)
    .map((a) => slugify(a))
    .filter(Boolean)
  if (!aliases.includes(slug)) aliases.unshift(slug)
  const oneLinerResult = normalizeOneLiner(form.get('oneLiner'))

  if (!displayName) return { ok: false, error: 'Display name required.' }
  if (!scientificName) return { ok: false, error: 'Scientific name required.' }
  if (!slug) return { ok: false, error: 'Slug could not be derived.' }
  if ('error' in oneLinerResult) return { ok: false, error: oneLinerResult.error }

  const tickIds = readIdList(form, 'tickIds')
  const diseaseIds = readIdList(form, 'diseaseIds')

  const db = connect(process.env.DATABASE_URL)
  try {
    await db
      .insert(schema.pathogens)
      .values({ slug, displayName, scientificName, oneLiner: oneLinerResult.value, aliases })
      .onConflictDoUpdate({
        target: schema.pathogens.slug,
        set: {
          displayName: sql`EXCLUDED.display_name`,
          scientificName: sql`EXCLUDED.scientific_name`,
          oneLiner: sql`EXCLUDED.one_liner`,
          aliases: sql`EXCLUDED.aliases`,
          updatedAt: sql`now()`,
        },
      })
  } catch (err) {
    // Most likely failure: scientific_name unique-index collision on a
    // different slug. Surface it instead of a 500.
    return { ok: false, error: (err as Error).message }
  }

  const [row] = await db
    .select({ id: schema.pathogens.id })
    .from(schema.pathogens)
    .where(eq(schema.pathogens.slug, slug))
    .limit(1)

  if (row?.id) {
    await setRelations(
      db,
      {
        table: schema.tickPathogens,
        parentColumn: schema.tickPathogens.pathogenId,
        childColumn: schema.tickPathogens.tickId,
      },
      row.id,
      tickIds,
    )
    await setRelations(
      db,
      {
        table: schema.diseasePathogens,
        parentColumn: schema.diseasePathogens.pathogenId,
        childColumn: schema.diseasePathogens.diseaseId,
      },
      row.id,
      diseaseIds,
    )
  }

  await Promise.all([
    notifySemilayer('pathogens'),
    notifySemilayer('tickPathogens'),
    notifySemilayer('diseasePathogens'),
  ])
  revalidatePath('/content/pathogens')
  revalidatePath(`/content/pathogens/${slug}`)
  return { ok: true }
}

export async function deletePathogen(slug: string): Promise<void> {
  const db = connect(process.env.DATABASE_URL)
  await db.delete(schema.pathogens).where(eq(schema.pathogens.slug, slug))
  await notifySemilayer('pathogens')
  revalidatePath('/content/pathogens')
  redirect('/content/pathogens')
}
