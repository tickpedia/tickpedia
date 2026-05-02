// JSON tick import. Shape:
//   [
//     {
//       "slug": "ixodes-scapularis",            // optional, derived from scientificName
//       "commonName": "Black-legged tick",
//       "scientificName": "Ixodes scapularis",
//       "dangerLevel": "high",                   // optional, default 'low'
//       "heroPhotoUrl": "https://…",            // optional
//       "heroHeadColor": "#3a2a1a",             // optional, hex only
//       "heroBodyColor": "#7a4a2a",             // optional
//       "heroLegColor":  "#2a1a10",             // optional, omit / null = no legs
//       "diseases":            ["lyme-disease", "babesiosis"],   // optional, by disease slug
//       "removalTechniques":   ["fine-tip-tweezers"]              // optional, by technique slug
//     }
//   ]
//
// Idempotent: re-running the same payload only updates existing rows
// + bumps updated_at.

import { sql, inArray } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { notifySemilayer } from '../../../../../lib/semilayer-notify'
import { setRelations } from '../../../../../lib/relations'
import { emptySummary, readJsonInput, type ImportSummary } from '../../../../../lib/json-import'
import JsonImportForm from '../../../../components/JsonImportForm'

const SCHEMA_HINT = `[
  {
    "slug": "ixodes-scapularis",
    "commonName": "Black-legged tick",
    "scientificName": "Ixodes scapularis",
    "dangerLevel": "high",
    "heroHeadColor": "#3a2a1a",
    "heroBodyColor": "#7a4a2a",
    "heroLegColor":  "#2a1a10",
    "diseases":          ["lyme-disease"],
    "removalTechniques": ["fine-tip-tweezers"]
  }
]`

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)
}

async function importAction(
  _prev: ImportSummary | null,
  form: FormData,
): Promise<ImportSummary | null> {
  'use server'
  const parsed = await readJsonInput(form)
  if (!parsed) return null
  if ('error' in parsed) return { ...emptySummary(), errors: [{ row: 0, reason: parsed.error }] }

  const summary = emptySummary()
  const db = connect(process.env.DATABASE_URL)

  const [diseases, techniques] = await Promise.all([
    db
      .select({ id: schema.diseases.id, slug: schema.diseases.slug })
      .from(schema.diseases),
    db
      .select({ id: schema.removalTechniques.id, slug: schema.removalTechniques.slug })
      .from(schema.removalTechniques),
  ])
  const diseaseBySlug = new Map(diseases.map((d) => [d.slug, d.id]))
  const techniqueBySlug = new Map(techniques.map((t) => [t.slug, t.id]))

  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i]
    if (!r || typeof r !== 'object') {
      summary.errors.push({ row: i, reason: 'not an object' })
      continue
    }
    const rec = r as Record<string, unknown>
    const commonName = String(rec.commonName ?? '').trim()
    const scientificName = String(rec.scientificName ?? '').trim()
    if (!commonName || !scientificName) {
      summary.errors.push({ row: i, reason: 'commonName + scientificName required' })
      continue
    }
    const slug = String(rec.slug ?? '').trim() || slugify(scientificName)
    const dangerLevel = (['low', 'medium', 'high'] as const).find(
      (d) => d === rec.dangerLevel,
    ) ?? 'low'
    const heroPhotoUrl =
      typeof rec.heroPhotoUrl === 'string' && rec.heroPhotoUrl.trim() ? rec.heroPhotoUrl.trim() : null
    const heroHeadColor = isHexColor(rec.heroHeadColor) ? rec.heroHeadColor.toLowerCase() : null
    const heroBodyColor = isHexColor(rec.heroBodyColor) ? rec.heroBodyColor.toLowerCase() : null
    const heroLegColor = isHexColor(rec.heroLegColor) ? rec.heroLegColor.toLowerCase() : null

    try {
      await db
        .insert(schema.ticks)
        .values({
          slug,
          commonName,
          scientificName,
          dangerLevel,
          heroPhotoUrl,
          heroHeadColor,
          heroBodyColor,
          heroLegColor,
        })
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
            updatedAt: sql`now()`,
          },
        })

      const tickRows = await db
        .select({ id: schema.ticks.id })
        .from(schema.ticks)
        .where(inArray(schema.ticks.slug, [slug]))
        .limit(1)
      const tickId = tickRows[0]?.id
      if (!tickId) {
        summary.errors.push({ row: i, reason: 'failed to read back tick id' })
        continue
      }

      const diseaseIds = Array.isArray(rec.diseases)
        ? rec.diseases
            .map((d) => (typeof d === 'string' ? diseaseBySlug.get(d) : undefined))
            .filter((id): id is number => typeof id === 'number')
        : []
      const techniqueIds = Array.isArray(rec.removalTechniques)
        ? rec.removalTechniques
            .map((t) => (typeof t === 'string' ? techniqueBySlug.get(t) : undefined))
            .filter((id): id is number => typeof id === 'number')
        : []

      await setRelations(
        db,
        {
          table: schema.tickDiseases,
          parentColumn: schema.tickDiseases.tickId,
          childColumn: schema.tickDiseases.diseaseId,
        },
        tickId,
        diseaseIds,
      )
      await setRelations(
        db,
        {
          table: schema.tickRemovalTechniques,
          parentColumn: schema.tickRemovalTechniques.tickId,
          childColumn: schema.tickRemovalTechniques.removalTechniqueId,
        },
        tickId,
        techniqueIds,
      )

      summary.applied += 1
    } catch (err) {
      summary.errors.push({ row: i, reason: (err as Error).message })
    }
  }

  if (summary.applied > 0) {
    await Promise.all([
      notifySemilayer('ticks'),
      notifySemilayer('tickDiseases'),
      notifySemilayer('tickRemovalTechniques'),
    ])
  }
  return summary
}

export default function Page() {
  return (
    <div>
      <h1>Import: ticks (JSON)</h1>
      <p className="muted">
        Upserts by <code>slug</code> (auto-derived from scientific name if missing). Disease and
        removal-technique associations come in by slug too — the tick must reference rows that
        already exist.
      </p>
      <JsonImportForm action={importAction} schemaHint={SCHEMA_HINT} />
    </div>
  )
}
