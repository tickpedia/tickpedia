'use client'

import { useActionState, useState } from 'react'
import type { IngestSummary } from '@tickpedia/db/ingest'
import ImportSummary from '../../../components/ImportSummary'

interface KnownTick {
  slug: string
  commonName: string
  scientificName: string
}

export default function TickCountyImportForm({
  action,
  ticks,
}: {
  action: (prev: IngestSummary | null, form: FormData) => Promise<IngestSummary | null>
  ticks: KnownTick[]
}) {
  const [summary, formAction, pending] = useActionState(action, null)
  const [mode, setMode] = useState<'single' | 'multi'>('single')

  return (
    <form action={formAction} className="card">
      <ImportSummary summary={summary} />

      <div className="field">
        <label>Layout</label>
        <div className="row">
          <label className="row" style={{ marginBottom: 0 }}>
            <input
              type="radio"
              name="mode"
              value="single"
              checked={mode === 'single'}
              onChange={() => setMode('single')}
              style={{ width: 'auto' }}
            />
            <span>Single tick</span>
          </label>
          <label className="row" style={{ marginBottom: 0 }}>
            <input
              type="radio"
              name="mode"
              value="multi"
              checked={mode === 'multi'}
              onChange={() => setMode('multi')}
              style={{ width: 'auto' }}
            />
            <span>Multi-tick (auto-detect)</span>
          </label>
        </div>
      </div>

      {mode === 'single' && (
        <div className="field">
          <label htmlFor="tickSlug">Tick</label>
          <select id="tickSlug" name="tickSlug" required>
            {ticks.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.commonName} ({t.scientificName})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="year">Survey year</label>
        <input id="year" name="year" type="number" defaultValue={new Date().getFullYear() - 1} required />
      </div>

      <div className="field">
        <label htmlFor="headerRow">Header row index (advanced)</label>
        <input
          id="headerRow"
          name="headerRow"
          type="number"
          defaultValue={mode === 'multi' ? 1 : 0}
          min={0}
        />
        <small className="muted">
          0 = first row is headers. The 2025 Ixodes file has a banner on row 0, so use 1.
        </small>
      </div>

      <div className="field">
        <label className="row" style={{ marginBottom: 0 }}>
          <input type="checkbox" name="keepNoRecords" style={{ width: 'auto' }} />
          <span>Keep &ldquo;No records&rdquo; rows (default: skip)</span>
        </label>
      </div>

      <div className="field">
        <label htmlFor="file">XLSX file</label>
        <input id="file" name="file" type="file" accept=".xlsx" required />
      </div>

      <button type="submit" disabled={pending}>
        {pending ? 'Importing…' : 'Import'}
      </button>
    </form>
  )
}
