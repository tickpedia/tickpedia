import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import TechniqueForm, { type TechniqueFormInitial } from '../TechniqueForm'
import { upsertTechnique, deleteTechnique } from '../actions'

export default async function EditTechniquePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = connect(process.env.DATABASE_URL)
  const [row] = await db
    .select()
    .from(schema.removalTechniques)
    .where(eq(schema.removalTechniques.slug, slug))
    .limit(1)
  if (!row) notFound()

  const [ticks, tickLinks] = await Promise.all([
    db
      .select({ id: schema.ticks.id, commonName: schema.ticks.commonName })
      .from(schema.ticks)
      .orderBy(schema.ticks.commonName),
    db
      .select({ tickId: schema.tickRemovalTechniques.tickId })
      .from(schema.tickRemovalTechniques)
      .where(eq(schema.tickRemovalTechniques.removalTechniqueId, row.id)),
  ])

  const initial: TechniqueFormInitial = {
    title: row.title,
    slug: row.slug,
    steps: row.steps,
    sourceUrl: row.sourceUrl ?? '',
    tickIds: tickLinks.map((t) => t.tickId),
  }

  async function deleteAction() {
    'use server'
    await deleteTechnique(slug)
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: '0.25rem' }}>
        <Link href="/content/techniques">← All techniques</Link>
      </p>
      <h1>{row.title}</h1>
      <p className="muted">
        <code>{row.slug}</code>
      </p>

      <TechniqueForm
        action={upsertTechnique}
        initial={initial}
        mode="edit"
        ticks={ticks.map((t) => ({ value: String(t.id), label: t.commonName }))}
      />

      <div className="card" style={{ borderColor: 'var(--error)' }}>
        <h3 style={{ color: 'var(--error)', marginTop: 0 }}>Danger zone</h3>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          Deletes this technique. Cascades through <code>tick_removal_techniques</code> and{' '}
          <code>wild_fact_removal_techniques</code>.
        </p>
        <form action={deleteAction}>
          <button
            type="submit"
            className="secondary"
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            Delete technique
          </button>
        </form>
      </div>
    </div>
  )
}
