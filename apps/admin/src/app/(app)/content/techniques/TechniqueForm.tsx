'use client'

import { useActionState, useRef, useEffect } from 'react'

type Result = { ok: boolean; error?: string }
const init: Result = { ok: false }

export default function TechniqueForm({
  action,
}: {
  action: (form: FormData) => Promise<Result>
}) {
  const ref = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(
    async (_p: Result, f: FormData) => action(f),
    init,
  )

  useEffect(() => {
    if (state.ok) ref.current?.reset()
  }, [state])

  return (
    <form action={formAction} ref={ref} className="card">
      <h3>Add / update technique</h3>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.ok ? <div className="alert success">Saved.</div> : null}
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug (optional — auto-derived from title)</label>
        <input id="slug" name="slug" placeholder="auto" />
      </div>
      <div className="field">
        <label htmlFor="steps">Steps (one per line)</label>
        <textarea id="steps" name="steps" rows={6} required />
      </div>
      <div className="field">
        <label htmlFor="sourceUrl">Source URL</label>
        <input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://…" />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save technique'}
      </button>
    </form>
  )
}
