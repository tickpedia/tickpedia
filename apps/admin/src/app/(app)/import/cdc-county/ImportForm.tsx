'use client'

// Thin wrapper that adds a "Survey year" input to BasicImportForm — the
// CDC county-year mode is the only one that pins the whole sheet to a
// single year.

import BasicImportForm from '../../../components/BasicImportForm'
import type { IngestSummary } from '@tickpedia/db/ingest'

export default function ImportForm({
  action,
}: {
  action: (prev: IngestSummary | null, form: FormData) => Promise<IngestSummary | null>
}) {
  return (
    <BasicImportForm action={action}>
      <div className="field">
        <label htmlFor="year">Survey year</label>
        <input
          id="year"
          name="year"
          type="number"
          defaultValue={new Date().getFullYear() - 1}
          required
        />
      </div>
    </BasicImportForm>
  )
}
