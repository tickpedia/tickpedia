import { useEffect, useRef, useState } from 'react'
import { beam } from '../lib/beam'

// Minimal real-time search:
//
//   * One <input>.
//   * As the user types, we debounce 150ms then fire two calls in parallel:
//       - beam.states.query   — exact-ish substring match on `name` and `slug`
//       - beam.ticks.search   — semantic search (vector + keyword hybrid)
//   * A request-id ref discards stale responses (last keystroke wins).
//   * No styles — partner will own the look.

const DEBOUNCE_MS = 150

interface StateRow {
  fips: string
  code: string
  slug: string
  name: string
}

interface TickRow {
  id: number
  slug: string
  commonName: string
  scientificName: string
}

export function SearchBox() {
  const [q, setQ] = useState('')
  const [states, setStates] = useState<StateRow[]>([])
  const [ticks, setTicks] = useState<TickRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const trimmed = q.trim()
    if (!trimmed) {
      setStates([])
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
        const [statesRes, ticksRes] = await Promise.all([
          beam.states.query({
            where: {
              $or: [{ name: { $contains: trimmed } }, { slug: { $contains: trimmed } }],
            },
            limit: 5,
          }),
          beam.ticks.search({ query: trimmed, limit: 5 }),
        ])
        if (id !== requestId.current) return // a newer keystroke landed
        setStates(statesRes.rows as StateRow[])
        setTicks((ticksRes.results ?? []).map((r) => r.metadata as TickRow))
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
        placeholder="Search states or ticks…"
        aria-label="Search states or ticks"
        autoFocus
      />

      {loading && <p data-testid="status-loading">searching…</p>}
      {error && (
        <p data-testid="status-error" role="alert">
          {error}
        </p>
      )}

      <h2>States</h2>
      <ul data-testid="results-states">
        {states.length === 0 && !loading && q.trim() && <li>(no states match)</li>}
        {states.map((s) => (
          <li key={s.fips}>
            <a href={`/us/${s.slug}`}>
              {s.name} ({s.code})
            </a>
          </li>
        ))}
      </ul>

      <h2>Ticks</h2>
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
