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
        <label htmlFor="file">XLSX file</label>
        <input id="file" name="file" type="file" accept=".xlsx" required />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? 'Importing…' : 'Import'}
      </button>
    </form>
  )
}
