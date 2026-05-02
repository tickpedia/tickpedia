// JSON disease import. Shape:
//   [
//     {
//       "slug": "lyme-disease",       // optional, derived from displayName
//       "displayName": "Lyme disease",
//       "aliases": ["lyme", "lyme-disease"],     // optional
//       "ticks":   ["ixodes-scapularis"]          // optional, by tick slug
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
    "slug": "lyme-disease",
    "displayName": "Lyme disease",
    "oneLiner": "Lyme disease is a bacterial infection (Borrelia burgdorferi) spread by black-legged ticks; the most common tick-borne illness in the US.",
    "aliases": ["lyme", "lyme-disease"],
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
    const displayName = String(rec.displayName ?? '').trim()
    if (!displayName) {
      summary.errors.push({ row: i, reason: 'displayName required' })
      continue
    }
    const slug = String(rec.slug ?? '').trim() || slugify(displayName)
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
        .insert(schema.diseases)
        .values({ slug, displayName, oneLiner: oneLinerResult.value, aliases })
        .onConflictDoUpdate({
          target: schema.diseases.slug,
          set: {
            displayName: sql`EXCLUDED.display_name`,
            oneLiner: sql`EXCLUDED.one_liner`,
            aliases: sql`EXCLUDED.aliases`,
            updatedAt: sql`now()`,
          },
        })
      const [row] = await db
        .select({ id: schema.diseases.id })
        .from(schema.diseases)
        .where(eq(schema.diseases.slug, slug))
        .limit(1)
      if (!row?.id) {
        summary.errors.push({ row: i, reason: 'failed to read back disease id' })
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
          table: schema.tickDiseases,
          parentColumn: schema.tickDiseases.diseaseId,
          childColumn: schema.tickDiseases.tickId,
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
    await Promise.all([notifySemilayer('diseases'), notifySemilayer('tickDiseases')])
  }
  return summary
}

export default function Page() {
  return (
    <div>
      <h1>Import: diseases (JSON)</h1>
      <p className="muted">
        Upserts by <code>slug</code>. Aliases are normalised through the same slug rules so
        case / spacing differences in the source don&rsquo;t cause duplicates.
      </p>
      <JsonImportForm action={importAction} schemaHint={SCHEMA_HINT} />
    </div>
  )
}
