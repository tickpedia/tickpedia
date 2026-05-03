'use client'

import { useActionState, useRef, useEffect } from 'react'
import Pillbox, { type PillboxOption } from '../../../components/Pillbox'
import OneLinerField from '../../../components/OneLinerField'

type Result = { ok: boolean; error?: string }
const init: Result = { ok: false }

export interface PathogenFormInitial {
  displayName: string
  scientificName: string
  slug: string
  oneLiner: string
  aliases: string[]
  tickIds: number[]
  diseaseIds: number[]
}

const EMPTY: PathogenFormInitial = {
  displayName: '',
  scientificName: '',
  slug: '',
  oneLiner: '',
  aliases: [],
  tickIds: [],
  diseaseIds: [],
}

export default function PathogenForm({
  action,
  initial,
  mode = 'create',
  ticks,
  diseases,
}: {
  action: (form: FormData) => Promise<Result>
  initial?: PathogenFormInitial
  mode?: 'create' | 'edit'
  ticks: PillboxOption[]
  diseases: PillboxOption[]
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
      <h3>{mode === 'edit' ? 'Edit pathogen' : 'Add pathogen'}</h3>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.ok ? <div className="alert success">Saved.</div> : null}
      <div className="field">
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" required defaultValue={start.displayName} />
      </div>
      <div className="field">
        <label htmlFor="scientificName">Scientific name</label>
        <input
          id="scientificName"
          name="scientificName"
          required
          defaultValue={start.scientificName}
          placeholder="Borrelia burgdorferi sensu stricto"
        />
      </div>
      <div className="field">
        <label htmlFor="slug">Slug{mode === 'create' ? ' (optional)' : ''}</label>
        <input
          id="slug"
          name="slug"
          defaultValue={start.slug}
          readOnly={mode === 'edit'}
          placeholder="auto from scientific name"
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
          placeholder="b-burgdorferi, borrelia-burgdorferi-sensu-stricto"
        />
      </div>
      <div className="field">
        <label>Ticks that carry this pathogen</label>
        <Pillbox
          name="tickIds"
          options={ticks}
          initial={start.tickIds.map(String)}
          placeholder="Search ticks…"
        />
      </div>
      <div className="field">
        <label>Diseases this pathogen causes</label>
        <Pillbox
          name="diseaseIds"
          options={diseases}
          initial={start.diseaseIds.map(String)}
          placeholder="Search diseases…"
        />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save pathogen'}
      </button>
    </form>
  )
}
