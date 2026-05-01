import { useEffect, useRef, useState } from 'react'
import { beam } from '../lib/beam'

// Real-time tick search:
//
//   * One <input>.
//   * Debounced 150ms, then `beam.ticks.search` (semantic).
//   * A request-id ref discards stale responses.

const DEBOUNCE_MS = 150

interface TickRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
}

export function SearchBox() {
  const [q, setQ] = useState('')
  const [ticks, setTicks] = useState<TickRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const trimmed = q.trim()
    if (!trimmed) {
      setTicks([])
      setLoading(false)
      setError(null)
      return
    }

    const id = ++requestId.current
    const handle = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await beam.ticks.search({ query: trimmed, limit: 5 })
        if (id !== requestId.current) return
        setTicks((res.results ?? []).map((r) => r.metadata as TickRow))
      } catch (e) {
        if (id !== requestId.current) return
        setError((e as Error).message)
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(handle)
  }, [q])

  return (
    <section data-testid="searchbox">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search ticks…"
        aria-label="Search ticks"
        autoFocus
      />

      {loading && <p data-testid="status-loading">searching…</p>}
      {error && (
        <p data-testid="status-error" role="alert">
          {error}
        </p>
      )}

      <ul data-testid="results-ticks">
        {ticks.length === 0 && !loading && q.trim() && <li>(no ticks match)</li>}
        {ticks.map((t) => (
          <li key={t.id}>
            <strong>{t.commonName}</strong> <em>{t.scientificName}</em>
          </li>
        ))}
      </ul>
    </section>
  )
}
