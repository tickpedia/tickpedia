'use client'

import { useActionState, useRef, useEffect } from 'react'
import Pillbox, { type PillboxOption } from '../../../components/Pillbox'
import OneLinerField from '../../../components/OneLinerField'

type Result = { ok: boolean; error?: string }
const init: Result = { ok: false }

export interface DiseaseFormInitial {
  displayName: string
  slug: string
  oneLiner: string
  aliases: string[]
  tickIds: number[]
}

const EMPTY: DiseaseFormInitial = {
  displayName: '',
  slug: '',
  oneLiner: '',
  aliases: [],
  tickIds: [],
}

export default function DiseaseForm({
  action,
  initial,
  mode = 'create',
  ticks,
}: {
  action: (form: FormData) => Promise<Result>
  initial?: DiseaseFormInitial
  mode?: 'create' | 'edit'
  ticks: PillboxOption[]
}) {
  const ref = useRef<HTMLFormElement>(null)
  const start = initial ?? EMPTY
  const [state, formAction, pending] = useActionState(
    async (_p: Result, f: FormData) => action(f),
    init,
  )
  useEffect(() => {
    if (state.ok && mode === 'create') ref.current?.reset()
  }, [state, mode])

  return (
    <form action={formAction} ref={ref} className="card">
      <h3>{mode === 'edit' ? 'Edit disease' : 'Add disease'}</h3>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.ok ? <div className="alert success">Saved.</div> : null}
      <div className="field">
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" required defaultValue={start.displayName} />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug{mode === 'create' ? ' (optional)' : ''}</label>
        <input
          id="slug"
          name="slug"
          defaultValue={start.slug}
          readOnly={mode === 'edit'}
          placeholder="auto from display name"
        />
      </div>
      <OneLinerField initial={start.oneLiner} />
      <div className="field">
        <label htmlFor="aliases">Aliases (comma or newline separated)</label>
        <textarea
          id="aliases"
          name="aliases"
          rows={3}
          defaultValue={start.aliases.join(', ')}
          placeholder="lyme, lyme-disease"
        />
      </div>
      <div className="field">
        <label>Ticks that transmit this disease</label>
        <Pillbox
          name="tickIds"
          options={ticks}
          initial={start.tickIds.map(String)}
          placeholder="Search ticks…"
        />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save disease'}
      </button>
    </form>
  )
}
