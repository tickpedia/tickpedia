import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import PathogenForm, { type PathogenFormInitial } from '../PathogenForm'
import { upsertPathogen, deletePathogen } from '../actions'

export default async function EditPathogenPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = connect(process.env.DATABASE_URL)
  const [row] = await db
    .select()
    .from(schema.pathogens)
    .where(eq(schema.pathogens.slug, slug))
    .limit(1)
  if (!row) notFound()

  const [ticks, diseases, tickLinks, diseaseLinks] = await Promise.all([
    db
      .select({ id: schema.ticks.id, commonName: schema.ticks.commonName })
      .from(schema.ticks)
      .orderBy(schema.ticks.commonName),
    db
      .select({ id: schema.diseases.id, displayName: schema.diseases.displayName })
      .from(schema.diseases)
      .orderBy(schema.diseases.displayName),
    db
      .select({ tickId: schema.tickPathogens.tickId })
      .from(schema.tickPathogens)
      .where(eq(schema.tickPathogens.pathogenId, row.id)),
    db
      .select({ diseaseId: schema.diseasePathogens.diseaseId })
      .from(schema.diseasePathogens)
      .where(eq(schema.diseasePathogens.pathogenId, row.id)),
  ])

  const initial: PathogenFormInitial = {
    displayName: row.displayName,
    scientificName: row.scientificName,
    slug: row.slug,
    oneLiner: row.oneLiner ?? '',
    aliases: row.aliases,
    tickIds: tickLinks.map((t) => t.tickId),
    diseaseIds: diseaseLinks.map((d) => d.diseaseId),
  }

  async function deleteAction() {
    'use server'
    await deletePathogen(slug)
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: '0.25rem' }}>
        <Link href="/content/pathogens">← All pathogens</Link>
      </p>
      <h1>{row.displayName}</h1>
      <p className="muted" style={{ fontStyle: 'italic' }}>
        {row.scientificName}
      </p>
      <p className="muted">
        <code>{row.slug}</code>
      </p>

      <PathogenForm
        action={upsertPathogen}
        initial={initial}
        mode="edit"
        ticks={ticks.map((t) => ({ value: String(t.id), label: t.commonName }))}
        diseases={diseases.map((d) => ({ value: String(d.id), label: d.displayName }))}
      />

      <div className="card" style={{ borderColor: 'var(--error)' }}>
        <h3 style={{ color: 'var(--error)', marginTop: 0 }}>Danger zone</h3>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          Deletes this pathogen. Cascades through <code>tick_pathogens</code>,{' '}
          <code>disease_pathogens</code>, and <code>pathogen_county</code> — all surveillance rows
          attached to this pathogen disappear with it.
        </p>
        <form action={deleteAction}>
          <button
            type="submit"
            className="secondary"
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            Delete pathogen
          </button>
        </form>
      </div>
    </div>
  )
}
