'use client'

import { useActionState, useRef, useEffect } from 'react'

type Result = { ok: boolean; error?: string }
const init: Result = { ok: false }

export default function DiseaseForm({
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
      <h3>Add / update disease</h3>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.ok ? <div className="alert success">Saved.</div> : null}
      <div className="field">
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" required />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug (optional)</label>
        <input id="slug" name="slug" placeholder="auto from display name" />
      </div>
      <div className="field">
        <label htmlFor="aliases">Aliases (comma or newline separated)</label>
        <textarea id="aliases" name="aliases" rows={3} placeholder="lyme, lyme-disease" />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save disease'}
      </button>
    </form>
  )
}
