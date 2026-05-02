import { revalidatePath } from 'next/cache'
import { connect, schema } from '@tickpedia/db'
import { desc, eq } from 'drizzle-orm'
import FactForm from './FactForm'

async function addFact(form: FormData): Promise<{ ok: boolean; error?: string }> {
  'use server'
  const body = String(form.get('body') ?? '').trim()
  const citationUrl = String(form.get('citationUrl') ?? '').trim() || null
  const tickIdRaw = String(form.get('tickId') ?? '').trim()
  const tickId = tickIdRaw ? Number(tickIdRaw) : null

  if (body.length < 10) return { ok: false, error: 'Body is too short.' }

  const db = connect(process.env.DATABASE_URL)
  await db.insert(schema.wildFacts).values({ body, citationUrl, tickId })
  revalidatePath('/content/facts')
  return { ok: true }
}

async function deleteFact(form: FormData): Promise<void> {
  'use server'
  const id = Number(form.get('id'))
  if (!Number.isInteger(id)) return
  const db = connect(process.env.DATABASE_URL)
  await db.delete(schema.wildFacts).where(eq(schema.wildFacts.id, id))
  revalidatePath('/content/facts')
}

export default async function Page() {
  const db = connect(process.env.DATABASE_URL)
  const [facts, ticks] = await Promise.all([
    db
      .select({
        id: schema.wildFacts.id,
        body: schema.wildFacts.body,
        citationUrl: schema.wildFacts.citationUrl,
        tickId: schema.wildFacts.tickId,
        updatedAt: schema.wildFacts.updatedAt,
      })
      .from(schema.wildFacts)
      .orderBy(desc(schema.wildFacts.updatedAt))
      .limit(50),
    db
      .select({ id: schema.ticks.id, commonName: schema.ticks.commonName })
      .from(schema.ticks)
      .orderBy(schema.ticks.commonName),
  ])

  return (
    <div>
      <h1>Wild facts</h1>
      <p className="muted">
        Short, citable facts shown next to ticks on the public site. Keep them surprising.
      </p>

      <FactForm addAction={addFact} ticks={ticks} />

      <div className="card">
        <h3>Recent facts</h3>
        {facts.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Body</th>
                <th>Tick</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {facts.map((f) => (
                <tr key={f.id}>
                  <td>
                    {f.body.slice(0, 200)}
                    {f.body.length > 200 ? '…' : ''}
                  </td>
                  <td>{ticks.find((t) => t.id === f.tickId)?.commonName ?? '—'}</td>
                  <td>{f.updatedAt.toISOString().slice(0, 10)}</td>
                  <td>
                    <form action={deleteFact}>
                      <input type="hidden" name="id" value={f.id} />
                      <button type="submit" className="secondary">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
