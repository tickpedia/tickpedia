// JSON wild-fact import. Shape:
//   [
//     {
//       "slug": "tick-life-cycle-stages",       // optional, derived from body
//       "body": "Ticks have four life stages: ...",
//       "citationUrl": "https://...",            // optional
//       "ticks":              ["ixodes-scapularis"],          // optional, by tick slug
//       "diseases":           ["lyme-disease"],               // optional, by disease slug
//       "removalTechniques":  ["fine-tip-tweezers"]           // optional, by technique slug
//     }
//   ]

import { sql, eq } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { notifySemilayer } from '../../../../../lib/semilayer-notify'
import { setRelations } from '../../../../../lib/relations'
import { emptySummary, readJsonInput, type ImportSummary } from '../../../../../lib/json-import'
import JsonImportForm from '../../../../components/JsonImportForm'

const SCHEMA_HINT = `[
  {
    "slug": "tick-life-cycle-stages",
    "body": "Ticks have four life stages: egg, larva, nymph, and adult.",
    "citationUrl": "https://www.cdc.gov/...",
    "ticks":              ["ixodes-scapularis"],
    "diseases":           ["lyme-disease"],
    "removalTechniques":  ["fine-tip-tweezers"]
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

  const [ticks, diseases, techniques] = await Promise.all([
    db.select({ id: schema.ticks.id, slug: schema.ticks.slug }).from(schema.ticks),
    db.select({ id: schema.diseases.id, slug: schema.diseases.slug }).from(schema.diseases),
    db
      .select({ id: schema.removalTechniques.id, slug: schema.removalTechniques.slug })
      .from(schema.removalTechniques),
  ])
  const tickBySlug = new Map(ticks.map((t) => [t.slug, t.id]))
  const diseaseBySlug = new Map(diseases.map((d) => [d.slug, d.id]))
  const techniqueBySlug = new Map(techniques.map((t) => [t.slug, t.id]))

  function resolveSlugs(input: unknown, lookup: Map<string, number>): number[] {
    if (!Array.isArray(input)) return []
    return input
      .map((s) => (typeof s === 'string' ? lookup.get(s) : undefined))
      .filter((id): id is number => typeof id === 'number')
  }

  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i]
    if (!r || typeof r !== 'object') {
      summary.errors.push({ row: i, reason: 'not an object' })
      continue
    }
    const rec = r as Record<string, unknown>
    const body = String(rec.body ?? '').trim()
    if (body.length < 10) {
      summary.errors.push({ row: i, reason: 'body required (min 10 chars)' })
      continue
    }
    const slug = String(rec.slug ?? '').trim() || slugify(body.slice(0, 80))
    const citationUrl =
      typeof rec.citationUrl === 'string' && rec.citationUrl.trim()
        ? rec.citationUrl.trim()
        : null

    try {
      await db
        .insert(schema.wildFacts)
        .values({ slug, body, citationUrl })
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
        .where(eq(schema.wildFacts.slug, slug))
        .limit(1)
      if (!row?.id) {
        summary.errors.push({ row: i, reason: 'failed to read back fact id' })
        continue
      }

      await setRelations(
        db,
        {
          table: schema.wildFactTicks,
          parentColumn: schema.wildFactTicks.wildFactId,
          childColumn: schema.wildFactTicks.tickId,
        },
        row.id,
        resolveSlugs(rec.ticks, tickBySlug),
      )
      await setRelations(
        db,
        {
          table: schema.wildFactDiseases,
          parentColumn: schema.wildFactDiseases.wildFactId,
          childColumn: schema.wildFactDiseases.diseaseId,
        },
        row.id,
        resolveSlugs(rec.diseases, diseaseBySlug),
      )
      await setRelations(
        db,
        {
          table: schema.wildFactRemovalTechniques,
          parentColumn: schema.wildFactRemovalTechniques.wildFactId,
          childColumn: schema.wildFactRemovalTechniques.removalTechniqueId,
        },
        row.id,
        resolveSlugs(rec.removalTechniques, techniqueBySlug),
      )
      summary.applied += 1
    } catch (err) {
      summary.errors.push({ row: i, reason: (err as Error).message })
    }
  }

  if (summary.applied > 0) {
    await Promise.all([
      notifySemilayer('wildFacts'),
      notifySemilayer('wildFactTicks'),
      notifySemilayer('wildFactDiseases'),
      notifySemilayer('wildFactRemovalTechniques'),
    ])
  }
  return summary
}

export default function Page() {
  return (
    <div>
      <h1>Import: wild facts (JSON)</h1>
      <p className="muted">
        Upserts by <code>slug</code> (auto-derived from the first ~80 chars of body if missing).
        All three association arrays are optional; referenced rows must already exist.
      </p>
      <JsonImportForm action={importAction} schemaHint={SCHEMA_HINT} />
    </div>
  )
}
