'use client'

import { useActionState, useRef, useEffect } from 'react'

type Result = { ok: boolean; error?: string }

const init: Result = { ok: false }

export default function FactForm({
  addAction,
  ticks,
}: {
  addAction: (form: FormData) => Promise<Result>
  ticks: { id: number; commonName: string }[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(
    async (_prev: Result, form: FormData) => addAction(form),
    init,
  )

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <form action={formAction} ref={formRef} className="card">
      <h3>Add a fact</h3>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.ok ? <div className="alert success">Saved.</div> : null}
      <div className="field">
        <label htmlFor="body">Body</label>
        <textarea id="body" name="body" rows={3} required minLength={10} />
      </div>
      <div className="field">
        <label htmlFor="tickId">Tick (optional)</label>
        <select id="tickId" name="tickId" defaultValue="">
          <option value="">— none —</option>
          {ticks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.commonName}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="citationUrl">Citation URL (optional)</label>
        <input id="citationUrl" name="citationUrl" type="url" placeholder="https://…" />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Add fact'}
      </button>
    </form>
  )
}
