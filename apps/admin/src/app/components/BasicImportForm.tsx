'use client'

import { useActionState, type ReactNode } from 'react'
import type { IngestSummary } from '@tickpedia/db/ingest'
import ImportSummary from './ImportSummary'

export default function BasicImportForm({
  action,
  children,
}: {
  action: (prev: IngestSummary | null, form: FormData) => Promise<IngestSummary | null>
  children?: ReactNode
}) {
  const [summary, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="card">
      <ImportSummary summary={summary} />
      {children}
      <div className="field">
        <label htmlFor="file">File (.xlsx or .csv)</label>
        <input id="file" name="file" type="file" accept=".xlsx,.csv" />
      </div>
      <div className="field">
        <label htmlFor="blob">…or paste CSV</label>
        <textarea
          id="blob"
          name="blob"
          rows={6}
          placeholder="State,County,FIPS,Lyme disease,…"
          style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.85rem' }}
        />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Importing…' : 'Import'}
      </button>
    </form>
  )
}
