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
  id?: number
}

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readFields(form: FormData) {
  const body = String(form.get('body') ?? '').trim()
  const citationUrl = String(form.get('citationUrl') ?? '').trim() || null
  const slugInput = String(form.get('slug') ?? '').trim()
  const slug = slugInput || slugify(body.slice(0, 80))
  return { body, citationUrl, slug }
}

async function syncFactRelations(
  db: ReturnType<typeof connect>,
  factId: number,
  form: FormData,
): Promise<void> {
  await Promise.all([
    setRelations(
      db,
      {
        table: schema.wildFactTicks,
        parentColumn: schema.wildFactTicks.wildFactId,
        childColumn: schema.wildFactTicks.tickId,
      },
      factId,
      readIdList(form, 'tickIds'),
    ),
    setRelations(
      db,
      {
        table: schema.wildFactDiseases,
        parentColumn: schema.wildFactDiseases.wildFactId,
        childColumn: schema.wildFactDiseases.diseaseId,
      },
      factId,
      readIdList(form, 'diseaseIds'),
    ),
    setRelations(
      db,
      {
        table: schema.wildFactRemovalTechniques,
        parentColumn: schema.wildFactRemovalTechniques.wildFactId,
        childColumn: schema.wildFactRemovalTechniques.removalTechniqueId,
      },
      factId,
      readIdList(form, 'removalTechniqueIds'),
    ),
  ])
}

export async function createFact(form: FormData): Promise<SaveResult> {
  const v = readFields(form)
  if (v.body.length < 10) return { ok: false, error: 'Body is too short.' }
  if (!v.slug) return { ok: false, error: 'Slug could not be derived from body.' }

  const db = connect(process.env.DATABASE_URL)
  await db
    .insert(schema.wildFacts)
    .values(v)
    .onConflictDoUpdate({
      target: schema.wildFacts.slug,
      set: {
        body: sql`EXCLUDED.body`,
        citationUrl: sql`EXCLUDED.citation_url`,
        updatedAt: sql`now()`,
      },
    })

  const [row] = await db
    .select({ id: schema.wildFacts.id })
    .from(schema.wildFacts)
    .where(eq(schema.wildFacts.slug, v.slug))
    .limit(1)

  if (!row?.id) return { ok: false, error: 'Insert failed.' }
  await syncFactRelations(db, row.id, form)

  await Promise.all([
    notifySemilayer('wildFacts'),
    notifySemilayer('wildFactTicks'),
    notifySemilayer('wildFactDiseases'),
    notifySemilayer('wildFactRemovalTechniques'),
  ])
  revalidatePath('/content/facts')
  return { ok: true, id: row.id }
}

export async function updateFact(id: number, form: FormData): Promise<SaveResult> {
  const v = readFields(form)
  if (v.body.length < 10) return { ok: false, error: 'Body is too short.' }
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'Bad fact id.' }

  // Slug stays whatever it was on creation; updates rewrite body /
  // citation only. This keeps the import handle stable.
  const db = connect(process.env.DATABASE_URL)
  await db
    .update(schema.wildFacts)
    .set({
      body: v.body,
      citationUrl: v.citationUrl,
      updatedAt: sql`now()`,
    })
    .where(eq(schema.wildFacts.id, id))

  await syncFactRelations(db, id, form)

  await Promise.all([
    notifySemilayer('wildFacts'),
    notifySemilayer('wildFactTicks'),
    notifySemilayer('wildFactDiseases'),
    notifySemilayer('wildFactRemovalTechniques'),
  ])
  revalidatePath('/content/facts')
  revalidatePath(`/content/facts/${id}`)
  return { ok: true, id }
}

export async function deleteFact(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) return
  const db = connect(process.env.DATABASE_URL)
  await db.delete(schema.wildFacts).where(eq(schema.wildFacts.id, id))
  await notifySemilayer('wildFacts')
  revalidatePath('/content/facts')
  redirect('/content/facts')
}
