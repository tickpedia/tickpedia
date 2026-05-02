import type { IngestSummary } from '@tickpedia/db/ingest'

export default function ImportSummary({ summary }: { summary: IngestSummary | null }) {
  if (!summary) return null
  return (
    <div className={'alert ' + (summary.errors.length === 0 ? 'success' : 'error')}>
      <strong>{summary.applied.toLocaleString()}</strong> rows applied
      {summary.skipped > 0 ? <> · <strong>{summary.skipped.toLocaleString()}</strong> skipped</> : null}
      {summary.errors.length > 0 ? (
        <>
          {' '}
          · <strong>{summary.errors.length}</strong> errors
          <details style={{ marginTop: '0.5rem' }}>
            <summary>Show errors</summary>
            <ul>
              {summary.errors.slice(0, 50).map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.reason}
                </li>
              ))}
              {summary.errors.length > 50 ? <li>… and {summary.errors.length - 50} more</li> : null}
            </ul>
          </details>
        </>
      ) : null}
    </div>
  )
}
