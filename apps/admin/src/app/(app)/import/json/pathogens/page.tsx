// JSON pathogen import. Shape matches the seed file
// `db/src/seeds/pathogens.ts` so a one-shot bootstrap can re-export
// from there into a JSON file and round-trip through this importer.
//
//   [
//     {
//       "slug": "borrelia-burgdorferi",                    // optional
//       "displayName": "Borrelia burgdorferi",
//       "scientificName": "Borrelia burgdorferi sensu stricto",
//       "oneLiner": "Spirochete that causes Lyme disease ...",
//       "aliases": ["b-burgdorferi"],                      // optional
//       "ticks":   ["blacklegged-tick"],                   // optional, by tick slug
//       "diseases":["lyme-disease"]                         // optional, by disease slug
//     }
//   ]
//
// Slugs in `ticks` / `diseases` that don't resolve are silently
// dropped (mirrors the seed's resilient lookup) — useful when a
// disease lives in the editorial JSON content, not the base seed.

import { sql, eq } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { notifySemilayer } from '../../../../../lib/semilayer-notify'
import { setRelations } from '../../../../../lib/relations'
import {
  emptySummary,
  normalizeOneLiner,
  readJsonInput,
  type ImportSummary,
} from '../../../../../lib/json-import'
import JsonImportForm from '../../../../components/JsonImportForm'

const SCHEMA_HINT = `[
  {
    "slug": "borrelia-burgdorferi",
    "displayName": "Borrelia burgdorferi",
    "scientificName": "Borrelia burgdorferi sensu stricto",
    "oneLiner": "Spirochete that causes Lyme disease in the eastern US (Ixodes scapularis) and on the west coast (I. pacificus).",
    "aliases": ["b-burgdorferi", "borrelia-burgdorferi-sensu-stricto"],
    "ticks": ["blacklegged-tick", "western-blacklegged-tick"],
    "diseases": ["lyme-disease"]
  }
]`

function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

  const [ticks, diseases] = await Promise.all([
    db.select({ id: schema.ticks.id, slug: schema.ticks.slug }).from(schema.ticks),
    db.select({ id: schema.diseases.id, slug: schema.diseases.slug }).from(schema.diseases),
  ])
  const tickBySlug = new Map(ticks.map((t) => [t.slug, t.id]))
  const diseaseBySlug = new Map(diseases.map((d) => [d.slug, d.id]))

  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i]
    if (!r || typeof r !== 'object') {
      summary.errors.push({ row: i, reason: 'not an object' })
      continue
    }
    const rec = r as Record<string, unknown>
    const displayName = String(rec.displayName ?? '').trim()
    const scientificName = String(rec.scientificName ?? '').trim()
    if (!displayName) {
      summary.errors.push({ row: i, reason: 'displayName required' })
      continue
    }
    if (!scientificName) {
      summary.errors.push({ row: i, reason: 'scientificName required' })
      continue
    }
    const slug = String(rec.slug ?? '').trim() || slugify(scientificName || displayName)
    const aliasesIn = Array.isArray(rec.aliases)
      ? rec.aliases.map((a) => slugify(String(a))).filter(Boolean)
      : []
    const aliases = aliasesIn.includes(slug) ? aliasesIn : [slug, ...aliasesIn]
    const oneLinerResult = normalizeOneLiner(rec.oneLiner)
    if ('error' in oneLinerResult) {
      summary.errors.push({ row: i, reason: oneLinerResult.error })
      continue
    }

    try {
      await db
        .insert(schema.pathogens)
        .values({
          slug,
          displayName,
          scientificName,
          oneLiner: oneLinerResult.value,
          aliases,
        })
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
      const [row] = await db
        .select({ id: schema.pathogens.id })
        .from(schema.pathogens)
        .where(eq(schema.pathogens.slug, slug))
        .limit(1)
      if (!row?.id) {
        summary.errors.push({ row: i, reason: 'failed to read back pathogen id' })
        continue
      }

      const tickIds = Array.isArray(rec.ticks)
        ? rec.ticks
            .map((s) => (typeof s === 'string' ? tickBySlug.get(s) : undefined))
            .filter((id): id is number => typeof id === 'number')
        : []
      const diseaseIds = Array.isArray(rec.diseases)
        ? rec.diseases
            .map((s) => (typeof s === 'string' ? diseaseBySlug.get(s) : undefined))
            .filter((id): id is number => typeof id === 'number')
        : []

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
      summary.applied += 1
    } catch (err) {
      summary.errors.push({ row: i, reason: (err as Error).message })
    }
  }

  if (summary.applied > 0) {
    await Promise.all([
      notifySemilayer('pathogens'),
      notifySemilayer('tickPathogens'),
      notifySemilayer('diseasePathogens'),
    ])
  }
  return summary
}

export default function Page() {
  return (
    <div>
      <h1>Import: pathogens (JSON)</h1>
      <p className="muted">
        Upserts by <code>slug</code>. Same shape as <code>db/src/seeds/pathogens.ts</code> — you
        can round-trip the seed through here. <code>ticks</code> and <code>diseases</code> are
        lists of slugs; unknown slugs are silently dropped (mirrors the resilient seed lookup).
      </p>
      <JsonImportForm action={importAction} schemaHint={SCHEMA_HINT} />
    </div>
  )
}
