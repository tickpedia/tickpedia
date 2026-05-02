import { useEffect, useRef, useState } from 'react'
import { beam } from '../lib/beam'

// Latest-first feed of wild facts. Backed by the `wildFacts.feeds.latest`
// SemiLayer feed (recency rank, page size 20). Infinite scroll via an
// IntersectionObserver sentinel at the bottom of the column.

interface FactRow {
  id: number
  slug: string
  body: string
  citationUrl: string | null
  createdAt: string
}

export function Feed() {
  const [items, setItems] = useState<FactRow[]>([])
  const [cursor, setCursor] = useState<string | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const seenIds = useRef(new Set<number>())

  // Initial fetch
  useEffect(() => {
    void loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-load when the sentinel scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    if (cursor === null) return // no more pages
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore()
      },
      { rootMargin: '200px' },
    )
    obs.observe(node)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loading])

  async function loadMore() {
    if (loading) return
    if (cursor === null) return
    setLoading(true)
    setError(null)
    try {
      const page =
        cursor === undefined
          ? await beam.wildFacts.feed.latest()
          : await beam.wildFacts.feed.latest.next({ cursor })
      const fresh: FactRow[] = []
      for (const item of page.items) {
        const row = item.metadata as FactRow
        if (seenIds.current.has(row.id)) continue
        seenIds.current.add(row.id)
        fresh.push(row)
      }
      setItems((prev) => [...prev, ...fresh])
      setCursor(page.cursor)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="feed" data-testid="feed">
      <h2>Wild facts</h2>

      <ul data-testid="feed-items">
        {items.length === 0 && !loading && !error && <li>(no facts yet)</li>}
        {items.map((f) => (
          <li key={f.id}>
            <p>{f.body}</p>
            {f.citationUrl && (
              <small>
                <a href={f.citationUrl} rel="noreferrer">
                  source
                </a>
              </small>
            )}
          </li>
        ))}
      </ul>

      {loading && <p data-testid="feed-loading">loading…</p>}
      {error && (
        <p data-testid="feed-error" role="alert">
          {error}
        </p>
      )}
      {cursor === null && items.length > 0 && (
        <p data-testid="feed-end">— end —</p>
      )}

      <div ref={sentinelRef} aria-hidden="true" />
    </aside>
  )
}
