'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Pillbox, { type PillboxOption } from '../../../components/Pillbox'
import OneLinerField from '../../../components/OneLinerField'

type Result = { ok: boolean; error?: string }
const init: Result = { ok: false }

export type TechniqueKind = 'removal' | 'prevention' | 'aftercare' | 'diagnostic' | 'myth'
const ALL_KINDS: readonly { value: TechniqueKind; label: string }[] = [
  { value: 'removal', label: 'Removal' },
  { value: 'prevention', label: 'Prevention' },
  { value: 'aftercare', label: 'Aftercare' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'myth', label: 'Debunked / myth' },
]

export interface TechniqueFormInitial {
  title: string
  slug: string
  oneLiner: string
  steps: string
  sourceUrl: string
  tickIds: number[]
  kind: TechniqueKind
  /** 0–10 when kind = prevention; null otherwise. */
  preventionScore: number | null
  /** Multi-source bibliography. One URL per line in the textarea. */
  citations: string[]
}

const EMPTY: TechniqueFormInitial = {
  title: '',
  slug: '',
  oneLiner: '',
  steps: '',
  sourceUrl: '',
  tickIds: [],
  kind: 'removal',
  preventionScore: null,
  citations: [],
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

  // The score input is only meaningful when kind === 'prevention'. We
  // hide-and-disable it for the other kinds so the server action gets
  // a clean blank instead of a stale value the editor forgot was there.
  const [kind, setKind] = useState<TechniqueKind>(start.kind)
  const showScore = kind === 'prevention'

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

      <div className="field">
        <label htmlFor="kind">Kind</label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as TechniqueKind)}
        >
          {ALL_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <p className="muted" style={{ fontSize: '0.8rem', margin: '0.4rem 0 0' }}>
          Drives the public-site eyebrow, the &ldquo;do not use&rdquo; banner for
          myths, and which rail the entry lands in on a tick page.
        </p>
      </div>

      <OneLinerField initial={start.oneLiner} />

      <div className="field">
        <label htmlFor="steps">Steps (one per line)</label>
        <textarea id="steps" name="steps" rows={6} required defaultValue={start.steps} />
      </div>

      <div
        className="field"
        style={{ display: showScore ? undefined : 'none' }}
        aria-hidden={!showScore}
      >
        <label htmlFor="preventionScore">Prevention score (0–10)</label>
        <input
          id="preventionScore"
          name="preventionScore"
          type="number"
          min={0}
          max={10}
          step={1}
          defaultValue={start.preventionScore ?? ''}
          placeholder="e.g. 9"
          disabled={!showScore}
        />
        <p className="muted" style={{ fontSize: '0.8rem', margin: '0.4rem 0 0' }}>
          Evidence-weighted impact. 9–10 = strongest evidence + highest impact;
          0 = decorative. Only stored for the prevention kind.
        </p>
      </div>

      <div className="field">
        <label htmlFor="citations">Citations (one URL per line)</label>
        <textarea
          id="citations"
          name="citations"
          rows={4}
          defaultValue={start.citations.join('\n')}
          placeholder={'https://www.cdc.gov/ticks/...\nhttps://www.epa.gov/insect-repellents/...'}
        />
      </div>

      <div className="field">
        <label htmlFor="sourceUrl">Primary source URL (legacy — defaults to first citation)</label>
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
