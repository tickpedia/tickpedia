import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import { DEFAULT_TICK_ART } from '@tickpedia/ui'
import TickForm, { type TickFormInitial } from '../TickForm'
import { upsertTick, deleteTick } from '../actions'

export default async function EditTickPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = connect(process.env.DATABASE_URL)
  const [row] = await db
    .select()
    .from(schema.ticks)
    .where(eq(schema.ticks.slug, slug))
    .limit(1)
  if (!row) notFound()

  const [diseases, techniques, diseaseLinks, techniqueLinks] = await Promise.all([
    db
      .select({ id: schema.diseases.id, displayName: schema.diseases.displayName })
      .from(schema.diseases)
      .orderBy(schema.diseases.displayName),
    db
      .select({ id: schema.removalTechniques.id, title: schema.removalTechniques.title })
      .from(schema.removalTechniques)
      .orderBy(schema.removalTechniques.title),
    db
      .select({ diseaseId: schema.tickDiseases.diseaseId })
      .from(schema.tickDiseases)
      .where(eq(schema.tickDiseases.tickId, row.id)),
    db
      .select({ removalTechniqueId: schema.tickRemovalTechniques.removalTechniqueId })
      .from(schema.tickRemovalTechniques)
      .where(eq(schema.tickRemovalTechniques.tickId, row.id)),
  ])

  const initial: TickFormInitial = {
    commonName: row.commonName,
    scientificName: row.scientificName,
    slug: row.slug,
    dangerLevel: row.dangerLevel,
    heroPhotoUrl: row.heroPhotoUrl ?? '',
    heroHeadColor: row.heroHeadColor ?? DEFAULT_TICK_ART.headColor,
    heroBodyColor: row.heroBodyColor ?? DEFAULT_TICK_ART.bodyColor,
    heroLegColor: row.heroLegColor ?? DEFAULT_TICK_ART.legColor,
    diseaseIds: diseaseLinks.map((d) => d.diseaseId),
    removalTechniqueIds: techniqueLinks.map((t) => t.removalTechniqueId),
  }

  async function deleteAction() {
    'use server'
    await deleteTick(slug)
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: '0.25rem' }}>
        <Link href="/content/ticks">← All ticks</Link>
      </p>
      <h1>{row.commonName}</h1>
      <p className="muted">
        <em>{row.scientificName}</em>
      </p>

      <TickForm
        action={upsertTick}
        initial={initial}
        mode="edit"
        diseases={diseases.map((d) => ({ value: String(d.id), label: d.displayName }))}
        techniques={techniques.map((t) => ({ value: String(t.id), label: t.title }))}
      />

      <div className="card" style={{ borderColor: 'var(--error)' }}>
        <h3 style={{ color: 'var(--error)', marginTop: 0 }}>Danger zone</h3>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          Deletes this tick row. Cascades through <code>tick_state</code>,{' '}
          <code>tick_county</code>, <code>tick_diseases</code>,{' '}
          <code>tick_removal_techniques</code>, and <code>wild_fact_ticks</code>.
        </p>
        <form action={deleteAction}>
          <button
            type="submit"
            className="secondary"
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            Delete tick
          </button>
        </form>
      </div>
    </div>
  )
}
