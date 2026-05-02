import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { connect, schema } from '@tickpedia/db'
import DiseaseForm, { type DiseaseFormInitial } from '../DiseaseForm'
import { upsertDisease, deleteDisease } from '../actions'

export default async function EditDiseasePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = connect(process.env.DATABASE_URL)
  const [row] = await db
    .select()
    .from(schema.diseases)
    .where(eq(schema.diseases.slug, slug))
    .limit(1)
  if (!row) notFound()

  const [ticks, tickLinks] = await Promise.all([
    db
      .select({ id: schema.ticks.id, commonName: schema.ticks.commonName })
      .from(schema.ticks)
      .orderBy(schema.ticks.commonName),
    db
      .select({ tickId: schema.tickDiseases.tickId })
      .from(schema.tickDiseases)
      .where(eq(schema.tickDiseases.diseaseId, row.id)),
  ])

  const initial: DiseaseFormInitial = {
    displayName: row.displayName,
    slug: row.slug,
    oneLiner: row.oneLiner ?? '',
    aliases: row.aliases,
    tickIds: tickLinks.map((t) => t.tickId),
  }

  async function deleteAction() {
    'use server'
    await deleteDisease(slug)
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: '0.25rem' }}>
        <Link href="/content/diseases">← All diseases</Link>
      </p>
      <h1>{row.displayName}</h1>
      <p className="muted">
        <code>{row.slug}</code>
      </p>

      <DiseaseForm
        action={upsertDisease}
        initial={initial}
        mode="edit"
        ticks={ticks.map((t) => ({ value: String(t.id), label: t.commonName }))}
      />

      <div className="card" style={{ borderColor: 'var(--error)' }}>
        <h3 style={{ color: 'var(--error)', marginTop: 0 }}>Danger zone</h3>
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          Deletes this disease. Cascades through <code>tick_diseases</code>,{' '}
          <code>wild_fact_diseases</code>, <code>disease_county_year</code>, and{' '}
          <code>disease_month</code>.
        </p>
        <form action={deleteAction}>
          <button
            type="submit"
            className="secondary"
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            Delete disease
          </button>
        </form>
      </div>
    </div>
  )
}
