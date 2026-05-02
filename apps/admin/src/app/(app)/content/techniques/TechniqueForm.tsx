'use client'

import { useActionState, useRef, useEffect } from 'react'
import Pillbox, { type PillboxOption } from '../../../components/Pillbox'
import OneLinerField from '../../../components/OneLinerField'

type Result = { ok: boolean; error?: string }
const init: Result = { ok: false }

export interface TechniqueFormInitial {
  title: string
  slug: string
  oneLiner: string
  steps: string
  sourceUrl: string
  tickIds: number[]
}

const EMPTY: TechniqueFormInitial = {
  title: '',
  slug: '',
  oneLiner: '',
  steps: '',
  sourceUrl: '',
  tickIds: [],
}

export default function TechniqueForm({
  action,
  initial,
  mode = 'create',
  ticks,
}: {
  action: (form: FormData) => Promise<Result>
  initial?: TechniqueFormInitial
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
      <h3>{mode === 'edit' ? 'Edit technique' : 'Add technique'}</h3>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.ok ? <div className="alert success">Saved.</div> : null}
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required defaultValue={start.title} />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug{mode === 'create' ? ' (optional — auto from title)' : ''}</label>
        <input
          id="slug"
          name="slug"
          defaultValue={start.slug}
          readOnly={mode === 'edit'}
          placeholder="auto"
        />
      </div>
      <OneLinerField initial={start.oneLiner} />
      <div className="field">
        <label htmlFor="steps">Steps (one per line)</label>
        <textarea id="steps" name="steps" rows={6} required defaultValue={start.steps} />
      </div>
      <div className="field">
        <label htmlFor="sourceUrl">Source URL</label>
        <input
          id="sourceUrl"
          name="sourceUrl"
          type="url"
          defaultValue={start.sourceUrl}
          placeholder="https://…"
        />
      </div>
      <div className="field">
        <label>Ticks this technique applies to</label>
        <Pillbox
          name="tickIds"
          options={ticks}
          initial={start.tickIds.map(String)}
          placeholder="Search ticks…"
        />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save technique'}
      </button>
    </form>
  )
}
