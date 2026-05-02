'use client'

import { useActionState } from 'react'
import type { ImportSummary } from '../../lib/json-import'

const init: ImportSummary | null = null

export default function JsonImportForm({
  action,
  schemaHint,
}: {
  action: (prev: ImportSummary | null, form: FormData) => Promise<ImportSummary | null>
  schemaHint: string
}) {
  const [state, formAction, pending] = useActionState(action, init)

  return (
    <>
      <form action={formAction} className="card">
        <h3>Import JSON</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Upload a <code>.json</code> file or paste a JSON array below. Each record is upserted
          by <code>slug</code>; re-running the same payload only updates the matched rows.
        </p>

        <div className="field">
          <label htmlFor="file">File (.json)</label>
          <input id="file" name="file" type="file" accept=".json,application/json" />
        </div>

        <div className="field">
          <label htmlFor="blob">…or paste JSON</label>
          <textarea
            id="blob"
            name="blob"
            rows={10}
            placeholder={schemaHint}
            style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.85rem' }}
          />
        </div>

        <button type="submit" disabled={pending}>
          {pending ? 'Importing…' : 'Import'}
        </button>
      </form>

      {state ? <ResultCard summary={state} /> : null}
    </>
  )
}

function ResultCard({ summary }: { summary: ImportSummary }) {
  const ok = summary.errors.length === 0
  return (
    <div className={'alert ' + (ok ? 'success' : 'error')}>
      <strong>
        {summary.applied} applied · {summary.skipped} skipped · {summary.errors.length} errors
      </strong>
      {summary.errors.length > 0 ? (
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
          {summary.errors.slice(0, 20).map((e, i) => (
            <li key={i} style={{ fontSize: '0.85rem' }}>
              row {e.row}: {e.reason}
            </li>
          ))}
          {summary.errors.length > 20 ? (
            <li className="muted">…and {summary.errors.length - 20} more</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
