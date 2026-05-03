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

const ALLOWED_KINDS = ['removal', 'prevention', 'aftercare', 'diagnostic', 'myth'] as const
type TechniqueKind = (typeof ALLOWED_KINDS)[number]

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseCitations(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== 'string') return []
  return raw
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export async function upsertTechnique(form: FormData): Promise<SaveResult> {
  const title = String(form.get('title') ?? '').trim()
  const steps = String(form.get('steps') ?? '').trim()
  const slugInput = String(form.get('slug') ?? '').trim()
  const slug = slugInput || slugify(title)
  const oneLinerResult = normalizeOneLiner(form.get('oneLiner'))

  if (!title) return { ok: false, error: 'Title required.' }
  if (!steps) return { ok: false, error: 'Steps required.' }
  if (!slug) return { ok: false, error: 'Slug could not be derived.' }
  if ('error' in oneLinerResult) return { ok: false, error: oneLinerResult.error }

  const kindRaw = String(form.get('kind') ?? 'removal')
  const kind: TechniqueKind = (ALLOWED_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as TechniqueKind)
    : 'removal'

  // The score field is only stored when kind = prevention. Anything
  // else gets nulled out, even if the form posted a stale value.
  let preventionScore: number | null = null
  if (kind === 'prevention') {
    const raw = form.get('preventionScore')
    if (typeof raw === 'string' && raw.trim() !== '') {
      const parsed = Number(raw)
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
        return { ok: false, error: 'Prevention score must be a number 0–10.' }
      }
      preventionScore = Math.round(parsed)
    }
  }

  const citations = parseCitations(form.get('citations'))
  for (const c of citations) {
    if (!/^https?:\/\//i.test(c)) {
      return { ok: false, error: `Citation must be an http(s) URL: ${c}` }
    }
  }

  // Source URL falls back to the first citation so a sloppy edit that
  // only fills citations still surfaces a primary source link.
  const sourceUrlInput = String(form.get('sourceUrl') ?? '').trim()
  const sourceUrl = sourceUrlInput || citations[0] || null

  const tickIds = readIdList(form, 'tickIds')

  const db = connect(process.env.DATABASE_URL)
  await db
    .insert(schema.removalTechniques)
    .values({
      slug,
      title,
      oneLiner: oneLinerResult.value,
      steps,
      sourceUrl,
      kind,
      preventionScore,
      citations,
    })
    .onConflictDoUpdate({
      target: schema.removalTechniques.slug,
      set: {
        title: sql`EXCLUDED.title`,
        oneLiner: sql`EXCLUDED.one_liner`,
        steps: sql`EXCLUDED.steps`,
        sourceUrl: sql`EXCLUDED.source_url`,
        kind: sql`EXCLUDED.kind`,
        preventionScore: sql`EXCLUDED.prevention_score`,
        citations: sql`EXCLUDED.citations`,
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
