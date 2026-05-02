'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { notifySemilayer } from '../../../../lib/semilayer-notify'

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

// Hex colors only — anything else is dropped so user free-text never
// reaches the inline-rendered SVG.
function normaliseColor(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return null
  return s.toLowerCase()
}

function readFormFields(form: FormData) {
  const commonName = String(form.get('commonName') ?? '').trim()
  const scientificName = String(form.get('scientificName') ?? '').trim()
  const slugInput = String(form.get('slug') ?? '').trim()
  const dangerLevel = String(form.get('dangerLevel') ?? 'low') as 'low' | 'medium' | 'high'
  const heroPhotoUrl = String(form.get('heroPhotoUrl') ?? '').trim() || null
  const heroHeadColor = normaliseColor(form.get('heroHeadColor'))
  const heroBodyColor = normaliseColor(form.get('heroBodyColor'))
  const heroLegColor = normaliseColor(form.get('heroLegColor'))
  const diseasesRaw = String(form.get('diseases') ?? '').trim()
  const diseases = diseasesRaw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    commonName,
    scientificName,
    slug: slugInput || slugify(scientificName || commonName),
    dangerLevel,
    heroPhotoUrl,
    heroHeadColor,
    heroBodyColor,
    heroLegColor,
    diseases,
  }
}

export async function upsertTick(form: FormData): Promise<SaveResult> {
  const v = readFormFields(form)
  if (!v.commonName) return { ok: false, error: 'Common name required.' }
  if (!v.scientificName) return { ok: false, error: 'Scientific name required.' }
  if (!v.slug) return { ok: false, error: 'Slug could not be derived.' }

  const db = connect(process.env.DATABASE_URL)
  await db
    .insert(schema.ticks)
    .values(v)
    .onConflictDoUpdate({
      target: schema.ticks.slug,
      set: {
        commonName: sql`EXCLUDED.common_name`,
        scientificName: sql`EXCLUDED.scientific_name`,
        dangerLevel: sql`EXCLUDED.danger_level`,
        heroPhotoUrl: sql`EXCLUDED.hero_photo_url`,
        heroHeadColor: sql`EXCLUDED.hero_head_color`,
        heroBodyColor: sql`EXCLUDED.hero_body_color`,
        heroLegColor: sql`EXCLUDED.hero_leg_color`,
        diseases: sql`EXCLUDED.diseases`,
        updatedAt: sql`now()`,
      },
    })
  await notifySemilayer('ticks')
  revalidatePath('/content/ticks')
  revalidatePath(`/content/ticks/${v.slug}`)
  return { ok: true }
}

export async function deleteTick(slug: string): Promise<void> {
  const db = connect(process.env.DATABASE_URL)
  await db.delete(schema.ticks).where(eq(schema.ticks.slug, slug))
  await notifySemilayer('ticks')
  revalidatePath('/content/ticks')
  redirect('/content/ticks')
}
