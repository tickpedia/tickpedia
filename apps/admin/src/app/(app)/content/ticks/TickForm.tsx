'use client'

import { useActionState, useRef, useEffect } from 'react'

type Result = { ok: boolean; error?: string }
const init: Result = { ok: false }

export default function TickForm({
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
      <h3>Add / update tick</h3>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.ok ? <div className="alert success">Saved.</div> : null}
      <div className="field">
        <label htmlFor="commonName">Common name</label>
        <input id="commonName" name="commonName" required />
      </div>
      <div className="field">
        <label htmlFor="scientificName">Scientific name</label>
        <input id="scientificName" name="scientificName" required />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug (optional — auto-derived from scientific name)</label>
        <input id="slug" name="slug" placeholder="auto" />
      </div>
      <div className="field">
        <label htmlFor="dangerLevel">Danger level</label>
        <select id="dangerLevel" name="dangerLevel" defaultValue="low">
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="heroPhotoUrl">Hero photo URL (optional)</label>
        <input id="heroPhotoUrl" name="heroPhotoUrl" type="url" placeholder="https://…" />
      </div>
      <div className="field">
        <label htmlFor="diseases">Disease display names (comma or newline)</label>
        <textarea id="diseases" name="diseases" rows={3} placeholder="Lyme disease, Babesiosis" />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save tick'}
      </button>
    </form>
  )
}
