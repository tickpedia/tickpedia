import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import FactForm, { type FactFormInitial } from '../FactForm'
import { updateFact, deleteFact } from '../actions'

export default async function EditFactPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const db = connect(process.env.DATABASE_URL)
  const [row] = await db
    .select()
    .from(schema.wildFacts)
    .where(eq(schema.wildFacts.id, id))
    .limit(1)
  if (!row) notFound()

  const [ticks, diseases, techniques, tickLinks, diseaseLinks, techniqueLinks] = await Promise.all(
    [
      db
        .select({ id: schema.ticks.id, commonName: schema.ticks.commonName })
        .from(schema.ticks)
        .orderBy(schema.ticks.commonName),
      db
        .select({ id: schema.diseases.id, displayName: schema.diseases.displayName })
        .from(schema.diseases)
        .orderBy(schema.diseases.displayName),
      db
        .select({ id: schema.removalTechniques.id, title: schema.removalTechniques.title })
        .from(schema.removalTechniques)
        .orderBy(schema.removalTechniques.title),
      db
        .select({ tickId: schema.wildFactTicks.tickId })
        .from(schema.wildFactTicks)
        .where(eq(schema.wildFactTicks.wildFactId, id)),
      db
        .select({ diseaseId: schema.wildFactDiseases.diseaseId })
        .from(schema.wildFactDiseases)
        .where(eq(schema.wildFactDiseases.wildFactId, id)),
      db
        .select({ removalTechniqueId: schema.wildFactRemovalTechniques.removalTechniqueId })
        .from(schema.wildFactRemovalTechniques)
        .where(eq(schema.wildFactRemovalTechniques.wildFactId, id)),
    ],
  )

  const initial: FactFormInitial = {
    body: row.body,
    citationUrl: row.citationUrl ?? '',
    tickIds: tickLinks.map((t) => t.tickId),
    diseaseIds: diseaseLinks.map((d) => d.diseaseId),
    removalTechniqueIds: techniqueLinks.map((t) => t.removalTechniqueId),
  }

  // Pre-bind id so the client form can submit a plain FormData.
  const boundUpdate = updateFact.bind(null, id)

  async function deleteAction() {
    'use server'
    await deleteFact(id)
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: '0.25rem' }}>
        <Link href="/content/facts">← All facts</Link>
      </p>
      <h1>Wild fact #{id}</h1>

      <FactForm
        action={boundUpdate}
        initial={initial}
        mode="edit"
        ticks={ticks.map((t) => ({ value: String(t.id), label: t.commonName }))}
        diseases={diseases.map((d) => ({ value: String(d.id), label: d.displayName }))}
        techniques={techniques.map((t) => ({ value: String(t.id), label: t.title }))}
      />

      <div className="card" style={{ borderColor: 'var(--error)' }}>
        <h3 style={{ color: 'var(--error)', marginTop: 0 }}>Danger zone</h3>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          Deletes this fact and all of its tick / disease / technique links.
        </p>
        <form action={deleteAction}>
          <button
            type="submit"
            className="secondary"
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            Delete fact
          </button>
        </form>
      </div>
    </div>
  )
}
