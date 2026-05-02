// JSON removal-technique import. Shape:
//   [
//     {
//       "slug": "fine-tip-tweezers",       // optional, derived from title
//       "title": "Fine-tip tweezers",
//       "steps": "1. Grasp ...",
//       "sourceUrl": "https://…",          // optional
//       "ticks": ["ixodes-scapularis"]     // optional, by tick slug
//     }
//   ]

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
    "slug": "fine-tip-tweezers",
    "title": "Fine-tip tweezers",
    "oneLiner": "Fine-tipped tweezers grip the tick at the skin and pull straight up — the CDC's recommended removal method for any embedded tick.",
    "steps": "1. Grasp the tick as close to the skin as possible.\\n2. ...",
    "sourceUrl": "https://www.cdc.gov/...",
    "ticks": ["ixodes-scapularis"]
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

  const ticks = await db
    .select({ id: schema.ticks.id, slug: schema.ticks.slug })
    .from(schema.ticks)
  const tickBySlug = new Map(ticks.map((t) => [t.slug, t.id]))

  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i]
    if (!r || typeof r !== 'object') {
      summary.errors.push({ row: i, reason: 'not an object' })
      continue
    }
    const rec = r as Record<string, unknown>
    const title = String(rec.title ?? '').trim()
    const steps = String(rec.steps ?? '').trim()
    if (!title || !steps) {
      summary.errors.push({ row: i, reason: 'title + steps required' })
      continue
    }
    const slug = String(rec.slug ?? '').trim() || slugify(title)
    const sourceUrl =
      typeof rec.sourceUrl === 'string' && rec.sourceUrl.trim() ? rec.sourceUrl.trim() : null
    const oneLinerResult = normalizeOneLiner(rec.oneLiner)
    if ('error' in oneLinerResult) {
      summary.errors.push({ row: i, reason: oneLinerResult.error })
      continue
    }

    try {
      await db
        .insert(schema.removalTechniques)
        .values({ slug, title, oneLiner: oneLinerResult.value, steps, sourceUrl })
        .onConflictDoUpdate({
          target: schema.removalTechniques.slug,
          set: {
            title: sql`EXCLUDED.title`,
            oneLiner: sql`EXCLUDED.one_liner`,
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
      if (!row?.id) {
        summary.errors.push({ row: i, reason: 'failed to read back technique id' })
        continue
      }

      const tickIds = Array.isArray(rec.ticks)
        ? rec.ticks
            .map((s) => (typeof s === 'string' ? tickBySlug.get(s) : undefined))
            .filter((id): id is number => typeof id === 'number')
        : []
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
      summary.applied += 1
    } catch (err) {
      summary.errors.push({ row: i, reason: (err as Error).message })
    }
  }

  if (summary.applied > 0) {
    await Promise.all([
      notifySemilayer('removalTechniques'),
      notifySemilayer('tickRemovalTechniques'),
    ])
  }
  return summary
}

export default function Page() {
  return (
    <div>
      <h1>Import: removal techniques (JSON)</h1>
      <p className="muted">
        Upserts by <code>slug</code>. Tick associations come in by tick slug — referenced ticks
        must already exist.
      </p>
      <JsonImportForm action={importAction} schemaHint={SCHEMA_HINT} />
    </div>
  )
}
