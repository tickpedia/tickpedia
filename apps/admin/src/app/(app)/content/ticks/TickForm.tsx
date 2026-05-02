'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { TickArt, DEFAULT_TICK_ART, type TickArtColors } from '@tickpedia/ui'
import Pillbox, { type PillboxOption } from '../../../components/Pillbox'

type Result = { ok: boolean; error?: string }
const init: Result = { ok: false }

export interface TickFormInitial {
  commonName: string
  scientificName: string
  slug: string
  dangerLevel: 'low' | 'medium' | 'high'
  heroPhotoUrl: string
  heroHeadColor: string
  heroBodyColor: string
  heroLegColor: string
  diseaseIds: number[]
  removalTechniqueIds: number[]
}

const EMPTY_INITIAL: TickFormInitial = {
  commonName: '',
  scientificName: '',
  slug: '',
  dangerLevel: 'low',
  heroPhotoUrl: '',
  heroHeadColor: DEFAULT_TICK_ART.headColor,
  heroBodyColor: DEFAULT_TICK_ART.bodyColor,
  heroLegColor: DEFAULT_TICK_ART.legColor,
  diseaseIds: [],
  removalTechniqueIds: [],
}

export default function TickForm({
  action,
  initial,
  mode = 'create',
  diseases,
  techniques,
}: {
  action: (form: FormData) => Promise<Result>
  initial?: TickFormInitial
  mode?: 'create' | 'edit'
  diseases: PillboxOption[]
  techniques: PillboxOption[]
}) {
  const ref = useRef<HTMLFormElement>(null)
  const start = initial ?? EMPTY_INITIAL
  const [state, formAction, pending] = useActionState(
    async (_p: Result, f: FormData) => action(f),
    init,
  )

  const [headColor, setHeadColor] = useState(start.heroHeadColor)
  const [bodyColor, setBodyColor] = useState(start.heroBodyColor)
  const [legColor, setLegColor] = useState(start.heroLegColor)
  const [includeLegs, setIncludeLegs] = useState(!!start.heroLegColor)

  useEffect(() => {
    if (state.ok && mode === 'create') {
      ref.current?.reset()
      setHeadColor(DEFAULT_TICK_ART.headColor)
      setBodyColor(DEFAULT_TICK_ART.bodyColor)
      setLegColor(DEFAULT_TICK_ART.legColor)
      setIncludeLegs(true)
    }
  }, [state, mode])

  const previewColors: TickArtColors = {
    headColor,
    bodyColor,
    legColor: includeLegs ? legColor : null,
  }

  return (
    <form action={formAction} ref={ref} className="card">
      <h3>{mode === 'edit' ? 'Edit tick' : 'Add tick'}</h3>
      {state.error ? <div className="alert error">{state.error}</div> : null}
      {state.ok ? <div className="alert success">Saved.</div> : null}

      <div className="row" style={{ alignItems: 'flex-start', gap: '1.5rem' }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="field">
            <label htmlFor="commonName">Common name</label>
            <input id="commonName" name="commonName" required defaultValue={start.commonName} />
          </div>
          <div className="field">
            <label htmlFor="scientificName">Scientific name</label>
            <input
              id="scientificName"
              name="scientificName"
              required
              defaultValue={start.scientificName}
            />
          </div>
          <div className="field">
            <label htmlFor="slug">Slug{mode === 'create' ? ' (optional — auto-derived)' : ''}</label>
            <input
              id="slug"
              name="slug"
              defaultValue={start.slug}
              readOnly={mode === 'edit'}
              placeholder="auto"
            />
          </div>
          <div className="field">
            <label htmlFor="dangerLevel">Danger level</label>
            <select id="dangerLevel" name="dangerLevel" defaultValue={start.dangerLevel}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="heroPhotoUrl">Hero photo URL (optional, real photo)</label>
            <input
              id="heroPhotoUrl"
              name="heroPhotoUrl"
              type="url"
              defaultValue={start.heroPhotoUrl}
              placeholder="https://…"
            />
          </div>
        </div>

        <div style={{ flex: '0 0 220px' }}>
          <label style={{ marginBottom: '0.5rem' }}>Hero art preview</label>
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TickArt colors={previewColors} size={180} />
          </div>

          <div className="field" style={{ marginTop: '0.75rem' }}>
            <label htmlFor="heroHeadColor">Head</label>
            <input
              id="heroHeadColor"
              name="heroHeadColor"
              type="color"
              value={headColor}
              onChange={(e) => setHeadColor(e.target.value)}
              style={{ height: 36, padding: 2 }}
            />
          </div>
          <div className="field">
            <label htmlFor="heroBodyColor">Body</label>
            <input
              id="heroBodyColor"
              name="heroBodyColor"
              type="color"
              value={bodyColor}
              onChange={(e) => setBodyColor(e.target.value)}
              style={{ height: 36, padding: 2 }}
            />
          </div>
          <div className="field">
            <label
              htmlFor="includeLegs"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <input
                id="includeLegs"
                type="checkbox"
                checked={includeLegs}
                onChange={(e) => setIncludeLegs(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Include legs
            </label>
          </div>
          {includeLegs ? (
            <div className="field">
              <label htmlFor="heroLegColor">Leg color</label>
              <input
                id="heroLegColor"
                name="heroLegColor"
                type="color"
                value={legColor}
                onChange={(e) => setLegColor(e.target.value)}
                style={{ height: 36, padding: 2 }}
              />
            </div>
          ) : (
            <input type="hidden" name="heroLegColor" value="" />
          )}
        </div>
      </div>

      <div className="field">
        <label>Diseases this tick can transmit</label>
        <Pillbox
          name="diseaseIds"
          options={diseases}
          initial={start.diseaseIds.map(String)}
          placeholder="Search diseases…"
        />
      </div>

      <div className="field">
        <label>Removal techniques that apply</label>
        <Pillbox
          name="removalTechniqueIds"
          options={techniques}
          initial={start.removalTechniqueIds.map(String)}
          placeholder="Search techniques…"
        />
      </div>

      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save tick'}
      </button>
    </form>
  )
}
