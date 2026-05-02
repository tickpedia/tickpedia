'use client'

import { useActionState, useEffect, useRef } from 'react'
import Pillbox, { type PillboxOption } from '../../../components/Pillbox'

type Result = { ok: boolean; error?: string; id?: number }
const init: Result = { ok: false }

export interface FactFormInitial {
  body: string
  citationUrl: string
  tickIds: number[]
  diseaseIds: number[]
  removalTechniqueIds: number[]
}

const EMPTY: FactFormInitial = {
  body: '',
  citationUrl: '',
  tickIds: [],
  diseaseIds: [],
  removalTechniqueIds: [],
}

export default function FactForm({
  action,
  initial,
  mode = 'create',
  ticks,
  diseases,
  techniques,
}: {
  action: (form: FormData) => Promise<Result>
  initial?: FactFormInitial
  mode?: 'create' | 'edit'
  ticks: PillboxOption[]
  diseases: PillboxOption[]
  techniques: PillboxOption[]
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
      <h3>{mode === 'edit' ? 'Edit fact' : 'Add a fact'}</h3>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.ok ? <div className="alert success">Saved.</div> : null}
      <div className="field">
        <label htmlFor="body">Body</label>
        <textarea
          id="body"
          name="body"
          rows={3}
          required
          minLength={10}
          defaultValue={start.body}
        />
      </div>
      <div className="field">
        <label htmlFor="citationUrl">Citation URL (optional)</label>
        <input
          id="citationUrl"
          name="citationUrl"
          type="url"
          placeholder="https://…"
          defaultValue={start.citationUrl}
        />
      </div>

      <div className="field">
        <label>Ticks</label>
        <Pillbox
          name="tickIds"
          options={ticks}
          initial={start.tickIds.map(String)}
          placeholder="Search ticks…"
        />
      </div>
      <div className="field">
        <label>Diseases</label>
        <Pillbox
          name="diseaseIds"
          options={diseases}
          initial={start.diseaseIds.map(String)}
          placeholder="Search diseases…"
        />
      </div>
      <div className="field">
        <label>Removal techniques</label>
        <Pillbox
          name="removalTechniqueIds"
          options={techniques}
          initial={start.removalTechniqueIds.map(String)}
          placeholder="Search techniques…"
        />
      </div>

      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add fact'}
      </button>
    </form>
  )
}
